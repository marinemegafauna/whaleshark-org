#!/usr/bin/env python3
"""Obsidian editing-surface sync for whaleshark.org (optional tooling, not part of the site).

The repo `content/` is CANONICAL. An Obsidian vault folder is an editable REFLECTION —
the maintainer edits pages/species files in Obsidian and this tool carries those edits
back as path-scoped commits. Adapted from marinemegafauna/mmf-website `scripts/vault_sync.py`
(same contract: pull / push / status, base-hash conflict halts, iCloud placeholders skipped).

Forks: either delete this script or point VAULT_ROOT at your own folder. Most forks will
use a git-based CMS on the same `content/` files instead (see docs/TEMPLATE.md).

Subcommands: pull (repo -> vault), push (vault -> repo, commits), status (read-only).
Flags: --dry-run, --settle-delay S. State: `<VAULT_ROOT>/.sync-state.json`; lock `.sync.lock`.
Python 3 stdlib only.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time

# --- Fixed locations (per spec Phase 4 / Architecture) -----------------------
REPO = os.environ.get("WHALESHARK_REPO", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT_ROOT = os.path.join(REPO, "content")
VAULT_ROOT = (
    "/Users/simonjpierce/Library/Mobile Documents/iCloud~md~obsidian/"
    "Documents/Simon's Vault/02_MARINE MEGAFAUNA/WHALESHARK.ORG/CONTENT"
)
COLLECTIONS = ["pages", "species"]
ROOT_FILES = ["site.md"]
EXTS = (".md", ".yaml", ".yml")
STATE_PATH = os.path.join(VAULT_ROOT, ".sync-state.json")
LOCK_PATH = os.path.join(VAULT_ROOT, ".sync.lock")


# --- Hashing -----------------------------------------------------------------
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read_bytes(path):
    with open(path, "rb") as f:
        return f.read()


# --- State (base-hash sidecar) ----------------------------------------------
def load_state():
    if not os.path.exists(STATE_PATH):
        return {}
    try:
        with open(STATE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("hashes", {}) if isinstance(data, dict) and "hashes" in data else data
    except Exception as e:
        print(f"WARN: sync-state unreadable ({e}); treating as empty.")
        return {}


def save_state(hashes):
    tmp = STATE_PATH + ".tmp"
    payload = {
        "_comment": "Base-hash sidecar for vault_sync.py — sha256 of repo file content "
                    "at last reflect, keyed by <collection>/<relpath>. Do not hand-edit.",
        "updated": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "hashes": hashes,
    }
    os.makedirs(VAULT_ROOT, exist_ok=True)
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)
        f.write("\n")
    os.replace(tmp, STATE_PATH)


# --- Lock --------------------------------------------------------------------
def _pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True  # exists, owned by someone else
    except Exception:
        return False


def acquire_lock():
    os.makedirs(VAULT_ROOT, exist_ok=True)
    for _ in range(2):
        try:
            fd = os.open(LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            os.write(fd, f"{os.getpid()} {time.time()}\n".encode())
            os.close(fd)
            return
        except FileExistsError:
            holder = ""
            pid = None
            try:
                holder = open(LOCK_PATH).read().strip()
                pid = int(holder.split()[0])
            except Exception:
                pid = None
            if pid is not None and not _pid_alive(pid):
                print(f"NOTE: reclaiming stale lock (dead pid {pid}).")
                try:
                    os.remove(LOCK_PATH)
                except FileNotFoundError:
                    pass
                continue
            print(f"FAIL: another sync run holds the lock ({LOCK_PATH}: {holder}). Aborting.")
            sys.exit(3)
    print("FAIL: could not acquire lock after reclaim attempt.")
    sys.exit(3)


def release_lock():
    try:
        os.remove(LOCK_PATH)
    except FileNotFoundError:
        pass


# --- File enumeration --------------------------------------------------------
def list_repo_files():
    """{relkey: abspath} for root content files and every collection file."""
    out = {}
    for name in ROOT_FILES:
        abspath = os.path.join(CONTENT_ROOT, name)
        if os.path.isfile(abspath):
            out[name] = abspath
    for coll in COLLECTIONS:
        base = os.path.join(CONTENT_ROOT, coll)
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, files in os.walk(base):
            for name in files:
                if name.endswith(EXTS):
                    abspath = os.path.join(dirpath, name)
                    rel = os.path.relpath(abspath, base)
                    out[f"{coll}/{rel}"] = abspath
    return out


def list_vault_files():
    """Return (materialised, placeholders).

    materialised: {relkey: abspath} for real .md files under each vault collection.
    placeholders: set of relkeys whose iCloud placeholder (`.<name>.icloud`) exists but
                  the real file is not present locally.
    """
    materialised, placeholders = {}, set()
    for name in ROOT_FILES:
        abspath = os.path.join(VAULT_ROOT, name)
        placeholder = os.path.join(VAULT_ROOT, f".{name}.icloud")
        if os.path.isfile(abspath):
            materialised[name] = abspath
        elif os.path.isfile(placeholder):
            placeholders.add(name)

    for coll in COLLECTIONS:
        base = os.path.join(VAULT_ROOT, coll)
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, files in os.walk(base):
            for name in files:
                if name.endswith(EXTS):
                    abspath = os.path.join(dirpath, name)
                    rel = os.path.relpath(abspath, base)
                    materialised[f"{coll}/{rel}"] = abspath
                elif name.startswith(".") and name.endswith(".icloud"):
                    # iCloud placeholder is ".<realname>.icloud"
                    real = name[1:-len(".icloud")]
                    if real.endswith(EXTS):
                        relparent = os.path.relpath(dirpath, base)
                        rel = real if relparent == "." else os.path.join(relparent, real)
                        placeholders.add(f"{coll}/{rel}")
    return materialised, placeholders


def vault_path_for(relkey):
    if "/" not in relkey:
        return os.path.join(VAULT_ROOT, relkey)
    coll, rest = relkey.split("/", 1)
    return os.path.join(VAULT_ROOT, coll, rest)


# --- Writing -----------------------------------------------------------------
def write_file(dest_abspath, data_bytes):
    os.makedirs(os.path.dirname(dest_abspath), exist_ok=True)
    tmp = dest_abspath + ".synctmp"
    with open(tmp, "wb") as f:
        f.write(data_bytes)
    os.replace(tmp, dest_abspath)


def git_commit_file(repo_relpath, message):
    """Stage + commit exactly one path (pathspec-scoped). Returns (ok, detail)."""
    add = subprocess.run(["git", "-C", REPO, "add", "--", repo_relpath],
                         capture_output=True, text=True)
    if add.returncode != 0:
        return False, f"git add failed: {add.stderr.strip()}"
    commit = subprocess.run(
        ["git", "-C", REPO, "commit", "-m", message, "--", repo_relpath],
        capture_output=True, text=True)
    if commit.returncode != 0:
        return False, f"git commit failed: {commit.stderr.strip() or commit.stdout.strip()}"
    return True, commit.stdout.strip().splitlines()[0] if commit.stdout.strip() else "committed"


# --- Report helper -----------------------------------------------------------
class Report:
    def __init__(self):
        self.rows = []      # (verb, relkey, note)
        self.counts = {}

    def add(self, verb, relkey, note=""):
        self.rows.append((verb, relkey, note))
        self.counts[verb] = self.counts.get(verb, 0) + 1

    def dump(self, title, dry):
        print(f"\n=== {title}{' (DRY RUN)' if dry else ''} ===")
        for verb, relkey, note in self.rows:
            line = f"  {verb:<16} {relkey}"
            if note:
                line += f"  — {note}"
            print(line)
        summary = ", ".join(f"{v}: {n}" for v, n in sorted(self.counts.items()))
        print(f"\n  {len(self.rows)} file(s) — {summary or 'nothing to do'}")
        return self.counts


# --- Settle helper -----------------------------------------------------------
def settle(delay):
    if delay > 0:
        time.sleep(delay)


# --- PULL --------------------------------------------------------------------
def cmd_pull(args):
    repo_files = list_repo_files()
    vault_files, placeholders = list_vault_files()   # directory listing done...
    settle(args.settle_delay)                        # ...then wait for iCloud, then hash
    state = load_state()
    rep = Report()
    conflicts = 0

    for relkey in sorted(repo_files):
        repo_abs = repo_files[relkey]
        repo_hash = sha256_file(repo_abs)
        base = state.get(relkey)
        vpath = vault_path_for(relkey)

        if relkey in placeholders and relkey not in vault_files:
            rep.add("skip-icloud", relkey, "placeholder not materialised locally")
            continue

        if relkey not in vault_files:
            rep.add("pulled-new", relkey)
            if not args.dry_run:
                write_file(vpath, read_bytes(repo_abs))
                state[relkey] = repo_hash
            continue

        vault_hash = sha256_file(vpath)
        if base is None:
            if vault_hash == repo_hash:
                rep.add("adopted", relkey, "matched repo; now tracked")
                if not args.dry_run:
                    state[relkey] = repo_hash
            else:
                rep.add("conflict-halt", relkey,
                        "untracked vault file differs from repo — not overwritten")
                conflicts += 1
            continue

        vault_dirty = vault_hash != base
        repo_changed = repo_hash != base
        if vault_dirty and repo_changed:
            rep.add("conflict-halt", relkey,
                    "both vault and repo changed since last reflect — resolve manually")
            conflicts += 1
        elif vault_dirty and not repo_changed:
            rep.add("vault-pending", relkey, "vault edit awaits push; repo unchanged")
        elif (not vault_dirty) and repo_changed:
            rep.add("pulled-updated", relkey)
            if not args.dry_run:
                write_file(vpath, read_bytes(repo_abs))
                state[relkey] = repo_hash
        else:
            rep.add("unchanged", relkey)

    # Files tracked previously but now gone from the repo (deleted upstream).
    for relkey in sorted(set(state) - set(repo_files)):
        if relkey not in vault_files:
            # vault copy also gone — deletion fully resolved; stop tracking (2026-08-19).
            del state[relkey]
            rep.add("deleted-both", relkey, "gone on both sides — tracking entry cleared")
        else:
            rep.add("repo-deleted", relkey,
                    "removed from repo; vault copy left in place (delete manually if desired)")

    if not args.dry_run:
        save_state(state)
    rep.dump("PULL (repo -> vault)", args.dry_run)
    return 1 if conflicts else 0


# --- PUSH --------------------------------------------------------------------
def cmd_push(args):
    repo_files = list_repo_files()
    vault_files, placeholders = list_vault_files()
    settle(args.settle_delay)
    state = load_state()
    rep = Report()
    conflicts = 0
    errors = 0

    for relkey in sorted(placeholders - set(vault_files)):
        rep.add("skip-icloud", relkey, "placeholder not materialised locally")

    for relkey in sorted(vault_files):
        vpath = vault_files[relkey]
        vault_hash = sha256_file(vpath)
        base = state.get(relkey)

        if base is None:
            rep.add("untracked", relkey, "no base hash — run `pull` first to reflect it")
            continue
        if vault_hash == base:
            rep.add("unchanged", relkey)
            continue

        # vault-side edit detected
        repo_abs = repo_files.get(relkey)
        if repo_abs is None:
            rep.add("conflict-halt", relkey, "repo file missing (deleted upstream) — resolve manually")
            conflicts += 1
            continue
        repo_hash = sha256_file(repo_abs)
        if repo_hash != base:
            rep.add("conflict-halt", relkey,
                    "repo changed since last reflect — no auto-merge; resolve manually")
            conflicts += 1
            continue

        # safe to apply
        repo_relpath = os.path.relpath(repo_abs, REPO)
        if args.dry_run:
            rep.add("would-push", relkey, f"-> {repo_relpath}")
            continue
        write_file(repo_abs, read_bytes(vpath))
        msg = (f"content: sync {relkey} from Obsidian vault edit\n\n"
               f"Phase 4 vault-editing-surface push (scripts/vault_sync.py).\n\n"
               f"Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>")
        ok, detail = git_commit_file(repo_relpath, msg)
        if ok:
            state[relkey] = vault_hash
            rep.add("pushed", relkey, detail)
        else:
            errors += 1
            rep.add("push-error", relkey, detail)

    if not args.dry_run:
        save_state(state)
    rep.dump("PUSH (vault -> repo)", args.dry_run)
    if conflicts or errors:
        return 1
    return 0


# --- STATUS ------------------------------------------------------------------
def cmd_status(args):
    repo_files = list_repo_files()
    vault_files, placeholders = list_vault_files()
    settle(args.settle_delay)
    state = load_state()
    rep = Report()

    all_keys = sorted(set(repo_files) | set(vault_files) | set(state) | set(placeholders))
    for relkey in all_keys:
        base = state.get(relkey)
        repo_abs = repo_files.get(relkey)
        vpath = vault_files.get(relkey)
        repo_hash = sha256_file(repo_abs) if repo_abs else None
        vault_hash = sha256_file(vpath) if vpath else None

        if relkey in placeholders and vpath is None:
            rep.add("icloud-placeholder", relkey, "not materialised locally")
            continue
        if repo_abs is None and vpath is None:
            # tracked in state but gone on BOTH sides (deleted upstream, vault copy
            # removed manually) — a resolved deletion, not a conflict (2026-08-19).
            rep.add("deleted-both", relkey, "gone on both sides — `pull` clears the tracking entry")
            continue
        if repo_abs and vpath is None:
            rep.add("new-in-repo", relkey, "not yet reflected — `pull` to add")
            continue
        if vpath and repo_abs is None:
            if base is None:
                rep.add("new-in-vault", relkey, "no repo counterpart / not tracked")
            else:
                rep.add("repo-deleted", relkey, "removed upstream; vault copy remains")
            continue

        # both exist
        if base is None:
            rep.add("untracked", relkey, "run `pull` to begin tracking")
            continue
        vault_dirty = vault_hash != base
        repo_changed = repo_hash != base
        if vault_dirty and repo_changed:
            rep.add("conflict", relkey, "both sides changed — resolve manually")
        elif vault_dirty:
            rep.add("vault-edited", relkey, "pushable — `push` to apply + commit")
        elif repo_changed:
            rep.add("repo-updated", relkey, "pullable — `pull` to refresh vault")
        else:
            rep.add("clean", relkey)

    counts = rep.dump("STATUS", False)
    dirty = sum(counts.get(k, 0) for k in
                ("conflict", "vault-edited", "repo-updated", "new-in-repo",
                 "new-in-vault", "repo-deleted", "untracked"))
    return 0 if dirty == 0 else 0  # status is informational; always exit 0


# --- CLI ---------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(
        description="Vault <-> repo content sync for the MMF website (spec Phase 4).")
    ap.add_argument("--dry-run", action="store_true",
                    help="print planned actions; write/commit nothing.")
    ap.add_argument("--settle-delay", type=float, default=3.0,
                    help="seconds to wait after listing vault files before hashing "
                         "(iCloud latency guard; default 3.0).")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("pull", help="repo -> vault: refresh the reflection.")
    sub.add_parser("push", help="vault -> repo: apply + commit vault-side edits.")
    sub.add_parser("status", help="read-only classification of every file.")
    args = ap.parse_args()

    if args.cmd == "status":
        return cmd_status(args)   # read-only, no lock

    acquire_lock()
    try:
        if args.cmd == "pull":
            return cmd_pull(args)
        if args.cmd == "push":
            return cmd_push(args)
    finally:
        release_lock()
    return 0


if __name__ == "__main__":
    sys.exit(main())
