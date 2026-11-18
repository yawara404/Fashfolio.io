import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock

spec = importlib.util.spec_from_file_location("fashfolio_service", Path(__file__).resolve().parents[1] / "service.py")
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)


class ServiceTests(unittest.TestCase):
    def test_checks_both_pages_and_their_application_scripts(self):
        def fetch(path, port=3005):
            if path in ("/", "/tryon"):
                return 'Fashfolio<script type="module" src="/_nuxt/entry.js"></script>', "text/html"
            return "export default {}", "application/javascript"
        with patch.object(service, "fetch", side_effect=fetch) as request:
            self.assertTrue(service.probe("frontend")[0])
            self.assertEqual([call.args[0] for call in request.call_args_list], ["/", "/_nuxt/entry.js", "/tryon", "/_nuxt/entry.js"])

    def test_html_instead_of_javascript_is_unhealthy(self):
        with patch.object(service, "fetch", return_value=('Fashfolio<script src="/_nuxt/entry.js"></script>', "text/html")):
            self.assertFalse(service.probe("frontend")[0])

    def test_api_must_be_our_service(self):
        with patch.object(service, "fetch", return_value=('{"status":"ok","service":"other"}', "application/json")):
            self.assertFalse(service.probe("backend")[0])

    def test_transient_failure_does_not_restart_and_success_clears_counter(self):
        with tempfile.TemporaryDirectory() as folder:
            state = Path(folder) / "state.json"
            with patch.object(service, "STATE", state), patch.object(service, "installed", return_value=True), patch.object(service, "rotate_logs"), patch.object(service, "probe", return_value=(False, "timeout")), patch.object(service, "launch") as launch:
                service.watchdog()
                service.watchdog()
                launch.assert_not_called()
                with patch.object(service, "probe", return_value=(True, "OK")):
                    service.watchdog()
                self.assertEqual(json.loads(state.read_text())["frontend"]["failures"], 0)

    def test_three_failures_restart_once_with_cooldown(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(service, "STATE", Path(folder) / "state.json"), patch.object(service, "installed", return_value=True), patch.object(service, "rotate_logs"), patch.object(service, "probe", return_value=(False, "timeout")), patch.object(service, "launch", return_value=Mock(returncode=0)) as launch:
                for _ in range(6):
                    service.watchdog()
                self.assertEqual(launch.call_count, 2)
                self.assertEqual(launch.call_args_list[0].args[:2], ("kickstart", "-k"))

    def test_intentionally_stopped_services_stay_stopped(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(service, "STATE", Path(folder) / "state.json"), patch.object(service, "installed", return_value=False), patch.object(service, "rotate_logs"), patch.object(service, "probe") as probe, patch.object(service, "launch") as launch:
                service.watchdog()
                probe.assert_not_called()
                launch.assert_not_called()

    def test_start_refuses_occupied_ports_before_loading_any_jobs(self):
        with patch.object(service, "installed", return_value=False), patch.object(service.socket, "socket") as socket, patch.object(service, "launch") as launch:
            socket.return_value.__enter__.return_value.bind.side_effect = OSError("in use")
            with self.assertRaisesRegex(RuntimeError, "Port 8085"):
                service.start()
            launch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
