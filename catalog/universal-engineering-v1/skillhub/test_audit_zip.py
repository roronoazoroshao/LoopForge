import hashlib
import io
import stat
import unittest
import zipfile

from audit_zip import audit_archive, AuditError


def fixture(entries):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data, mode in entries:
            info = zipfile.ZipInfo(name)
            info.create_system = 3
            info.external_attr = mode << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data)
    return out.getvalue()


def manifest(entries, version='1.0.0'):
    files = [{'path': name, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
             for name, data, _ in entries if not name.endswith('/')]
    return {'version': version, 'count': len(files), 'files': files}


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.good = [('SKILL.md', b'---\nname: example\ndescription: demo\n---\n# example', stat.S_IFREG | 0o644),
                     ('LICENSE', b'Synthetic test license', stat.S_IFREG | 0o644)]

    def run_audit(self, entries, expected=None, version='1.0.0'):
        return audit_archive(fixture(entries), manifest(entries) if expected is None else expected, version)

    def test_valid_file_inventory_not_certification(self):
        result = self.run_audit(self.good)
        self.assertTrue(result['integrityMatched'])
        self.assertFalse(result['certified'])
        self.assertEqual(result['status'], 'quarantined')
        self.assertEqual(len(result['files']), 2)

    def test_traversal_and_platform_paths(self):
        for name in ['../outside', '/etc/passwd', 'C:/Windows/a', 'a\\b', 'a/../b', 'a//b', 'a:stream', 'a/./b']:
            with self.subTest(name=name), self.assertRaises(AuditError):
                self.run_audit(self.good + [(name, b'x', stat.S_IFREG | 0o644)])

    def test_symlink(self):
        with self.assertRaises(AuditError):
            self.run_audit(self.good + [('link', b'/etc/passwd', stat.S_IFLNK | 0o777)])

    def test_case_collision(self):
        with self.assertRaises(AuditError):
            self.run_audit(self.good + [('skill.MD', b'x', stat.S_IFREG | 0o644)])

    def test_file_directory_collision(self):
        with self.assertRaises(AuditError):
            self.run_audit(self.good + [('SKILL.md/a', b'x', stat.S_IFREG | 0o644)])

    def test_size_limit(self):
        with self.assertRaises(AuditError):
            self.run_audit(self.good + [('large.txt', b'x' * (1024 * 1024 + 1), stat.S_IFREG | 0o644)])

    def test_missing_skill(self):
        with self.assertRaises(AuditError):
            self.run_audit(self.good[1:])

    def test_missing_license_is_flagged(self):
        self.assertIn('license file absent; verify rights separately', self.run_audit(self.good[:1])['warnings'])

    def test_executable_is_flagged(self):
        result = self.run_audit(self.good + [('scripts/setup.sh', b'echo test', stat.S_IFREG | 0o755)])
        self.assertTrue(any('scripts/setup.sh' in w for w in result['warnings']))

    def test_hash_mismatch(self):
        expected = manifest(self.good)
        expected['files'][0]['sha256'] = '0' * 64
        with self.assertRaises(AuditError):
            self.run_audit(self.good, expected)

    def test_version_mismatch_or_latest(self):
        for version in ['latest', '2.0.0']:
            with self.subTest(version=version), self.assertRaises(AuditError):
                self.run_audit(self.good, version=version)

    def test_unlisted_file(self):
        with self.assertRaises(AuditError):
            self.run_audit(self.good, manifest(self.good[:1]))

    def test_wrong_count(self):
        expected = manifest(self.good)
        expected['count'] = 99
        with self.assertRaises(AuditError):
            self.run_audit(self.good, expected)


if __name__ == '__main__':
    unittest.main()
