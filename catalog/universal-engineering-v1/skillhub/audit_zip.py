"""Read-only SkillHub ZIP integrity screen. Never extracts or executes files."""
import argparse
import hashlib
import io
import json
import re
import stat
import unicodedata
import zipfile
from pathlib import Path

MAX_ARCHIVE = 65 * 1024 * 1024
MAX_FILE = 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024
MAX_FILES = 500
MAX_ENTRIES = 2000
SHA = re.compile(r'[0-9a-f]{64}')
VERSION = re.compile(r'[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?')
RESERVED = re.compile(r'(?i)(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?')
SCRIPT_SUFFIXES = {'.sh', '.bash', '.ps1', '.bat', '.cmd', '.py', '.js', '.mjs', '.exe', '.dll', '.so', '.dylib', '.wasm', '.jar'}


class AuditError(ValueError):
    pass


def safe_path(name, directory=False):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or name.startswith('/'):
        raise AuditError('unsafe path')
    if any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise AuditError('control character in path')
    path = name[:-1] if directory and name.endswith('/') else name
    parts = path.split('/')
    if any(p in ('', '.', '..') or p.endswith((' ', '.')) or RESERVED.fullmatch(p) for p in parts):
        raise AuditError('unsafe path component')
    if len(path.encode('utf-8')) > 1024:
        raise AuditError('path too long')
    return path


def normalized(path):
    return unicodedata.normalize('NFC', path).casefold()


def expected_files(manifest, version):
    if not isinstance(version, str) or not VERSION.fullmatch(version):
        raise AuditError('explicit semver required')
    if not isinstance(manifest, dict) or manifest.get('version') != version:
        raise AuditError('manifest version mismatch')
    rows = manifest.get('files')
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_FILES:
        raise AuditError('invalid manifest file list')
    if type(manifest.get('count')) is not int or manifest['count'] != len(rows):
        raise AuditError('manifest count mismatch')
    out, seen = {}, set()
    for row in rows:
        if not isinstance(row, dict):
            raise AuditError('invalid manifest file')
        name = safe_path(row.get('path'))
        size, digest = row.get('size'), row.get('sha256')
        if normalized(name) in seen or type(size) is not int or not 0 <= size <= MAX_FILE or not isinstance(digest, str) or not SHA.fullmatch(digest):
            raise AuditError('invalid or duplicate manifest file')
        seen.add(normalized(name))
        out[name] = (size, digest)
    return out


def audit_archive(raw, manifest, version):
    """Match the complete file list; a match is integrity evidence, not approval."""
    expected = expected_files(manifest, version)
    if not isinstance(raw, bytes) or not 0 < len(raw) <= MAX_ARCHIVE:
        raise AuditError('invalid archive size')
    files, seen, prefixes, warnings = {}, {}, {}, []
    total = 0
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_ENTRIES:
                raise AuditError('too many entries')
            for info in entries:
                if info.orig_filename != info.filename:
                    raise AuditError('truncated archive path')
                directory = info.is_dir()
                name = safe_path(info.filename, directory)
                key = normalized(name)
                mode = info.external_attr >> 16
                kind = stat.S_IFMT(mode)
                if kind not in (0, stat.S_IFDIR if directory else stat.S_IFREG):
                    raise AuditError('non-regular entry')
                if info.flag_bits & 1 or info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    raise AuditError('encrypted or unsupported compression')
                if key in seen:
                    raise AuditError('duplicate or case-colliding entry')
                seen[key] = directory
                parts = name.split('/')
                for i in range(1, len(parts) + 1):
                    prefix = '/'.join(parts[:i])
                    normalized_prefix = normalized(prefix)
                    if normalized_prefix in prefixes and prefixes[normalized_prefix] != prefix:
                        raise AuditError('case-colliding path prefix')
                    prefixes[normalized_prefix] = prefix
                if directory:
                    if info.file_size != 0:
                        raise AuditError('nonempty directory entry')
                    continue
                if len(files) >= MAX_FILES or not 0 <= info.file_size <= MAX_FILE:
                    raise AuditError('file count or size exceeded')
                total += info.file_size
                if total > MAX_TOTAL:
                    raise AuditError('expanded size exceeded')
                if name not in expected:
                    raise AuditError('unlisted archive file')
                with archive.open(info) as handle:
                    data = handle.read(MAX_FILE + 1)
                digest = hashlib.sha256(data).hexdigest()
                if len(data) != info.file_size or (len(data), digest) != expected[name]:
                    raise AuditError('file hash or size mismatch')
                files[name] = {'path': name, 'size': len(data), 'sha256': digest}
                if name == 'SKILL.md':
                    if not data.decode('utf-8').strip():
                        raise AuditError('empty SKILL.md')
                if mode & 0o111 or Path(name).suffix.lower() in SCRIPT_SUFFIXES:
                    warnings.append('executable/script requires manual review: ' + name)
            for key, directory in seen.items():
                if not directory and any(other.startswith(key + '/') for other in seen):
                    raise AuditError('file/directory collision')
    except (zipfile.BadZipFile, NotImplementedError, RuntimeError, UnicodeError, OSError) as exc:
        raise AuditError('unreadable archive') from exc
    if set(files) != set(expected) or 'SKILL.md' not in files:
        raise AuditError('missing manifest file or root SKILL.md')
    if not any(Path(name).name.lower().startswith(('license', 'copying')) for name in files):
        warnings.append('license file absent; verify rights separately')
    return {'version': version, 'archiveSha256': hashlib.sha256(raw).hexdigest(),
            'integrityMatched': True, 'status': 'quarantined', 'certified': False,
            'files': [files[k] for k in sorted(files)], 'warnings': warnings,
            'limitations': 'File-list match only; source authenticity, signature, license, code and behavior require independent review.'}


def read_limited(path, limit):
    with Path(path).open('rb') as handle:
        data = handle.read(limit + 1)
    if len(data) > limit:
        raise AuditError('input exceeds size limit')
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    parser.add_argument('file_list', help='Exact-version official SkillHub files API JSON, independently authenticated')
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    try:
        manifest = json.loads(read_limited(args.file_list, 2 * 1024 * 1024))
        result = audit_archive(read_limited(args.archive, MAX_ARCHIVE), manifest, args.version)
    except (AuditError, OSError, ValueError, UnicodeError) as exc:
        parser.exit(1, 'REJECTED: ' + str(exc) + '\n')
    print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
