"""python -m app.library ingest <folder> --out <library> [--mal-id N] [--dry-run]

Converts a folder of episodes for the `local` video source. See deploy/README.md."""

import argparse
import os
from pathlib import Path

from app.library.ingest import IngestError, Options, find_episodes, ingest, load_manifest


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.library")
    commands = parser.add_subparsers(dest="command", required=True)
    cmd = commands.add_parser("ingest", help="convert a folder of episodes")
    cmd.add_argument("folder", type=Path, help="folder with the episode files (read only)")
    cmd.add_argument(
        "--out",
        type=Path,
        default=os.environ.get("LOCAL_LIBRARY_DIR") or None,
        help="library folder to write to (default: $LOCAL_LIBRARY_DIR)",
    )
    cmd.add_argument("--manifest", type=Path, help="default: <folder>/moonroom.toml")
    cmd.add_argument("--mal-id", type=int)
    cmd.add_argument("--lang", choices=["sub", "dub"])
    cmd.add_argument("--title")
    cmd.add_argument("--default-subtitle", help='subtitle track title to start with, e.g. "Emmid"')
    cmd.add_argument("--episodes", help="only these episode numbers, e.g. 1,2,5")
    cmd.add_argument("--force", action="store_true", help="convert again even if done")
    cmd.add_argument("--preset", default="medium", help="x264 preset for the H.264 copy")
    cmd.add_argument("--crf", type=int, default=19, help="x264 quality, lower is better")
    cmd.add_argument("--dry-run", action="store_true", help="only show the episode mapping")
    args = parser.parse_args()

    try:
        manifest = load_manifest(
            args.folder,
            args.manifest,
            {
                "mal_id": args.mal_id,
                "lang": args.lang,
                "title": args.title,
                "default_subtitle": args.default_subtitle,
            },
        )
        if args.dry_run:
            print(f"MAL {manifest.mal_id} ({manifest.lang}) {manifest.title!r}")
            for number, path in sorted(find_episodes(args.folder, manifest).items()):
                print(f"  {number:>4}  {path.name}")
            return
        if args.out is None:
            raise IngestError("Pass --out or set LOCAL_LIBRARY_DIR")
        only = {int(n) for n in args.episodes.split(",")} if args.episodes else None
        options = Options(force=args.force, preset=args.preset, crf=args.crf)
        done = ingest(args.folder, args.out, manifest, options, only)
    except IngestError as e:
        raise SystemExit(f"error: {e}") from e
    print(f"Done: {done} episode(s) converted")


if __name__ == "__main__":
    main()
