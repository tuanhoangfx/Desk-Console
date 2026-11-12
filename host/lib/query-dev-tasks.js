// Windows Script Host (ES3 JScript) — queries root-folder Dev-* Scheduled Tasks
// in a single COM Schedule.Service call (1 process instead of N schtasks.exe spawns).
var svc = new ActiveXObject("Schedule.Service");
svc.Connect();
var tasks = svc.GetFolder("\\").GetTasks(1);

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function fmtLocal(ms) {
  if (!ms || isNaN(ms)) return "N/A";
  var dt = new Date(ms);
  if (dt.getFullYear() < 2005) return "N/A";
  return (
    pad2(dt.getDate()) +
    "/" +
    pad2(dt.getMonth() + 1) +
    "/" +
    dt.getFullYear() +
    " " +
    pad2(dt.getHours()) +
    ":" +
    pad2(dt.getMinutes()) +
    ":" +
    pad2(dt.getSeconds())
  );
}

function fmtIso(ms) {
  if (!ms || isNaN(ms)) return "";
  var dt = new Date(ms);
  if (dt.getFullYear() < 2005) return "";
  return (
    dt.getUTCFullYear() +
    "-" +
    pad2(dt.getUTCMonth() + 1) +
    "-" +
    pad2(dt.getUTCDate()) +
    "T" +
    pad2(dt.getUTCHours()) +
    ":" +
    pad2(dt.getUTCMinutes()) +
    ":" +
    pad2(dt.getUTCSeconds()) +
    ".000Z"
  );
}

for (var i = 1; i <= tasks.Count; i++) {
  var t = tasks.Item(i);
  var name = String(t.Name || "");
  if (!/^Dev(?:-|WorkspaceBackup$)/i.test(name)) continue;
  var stateNum = Number(t.State);
  var status = !t.Enabled ? "Disabled" : stateNum === 4 ? "Running" : "Ready";
  var lastMs = 0;
  var nextMs = 0;
  try {
    lastMs = new Date(t.LastRunTime).getTime();
  } catch (e1) {}
  try {
    nextMs = new Date(t.NextRunTime).getTime();
  } catch (e2) {}
  var lastRes = String(t.LastTaskResult);
  var xml = String(t.Xml || "").replace(/[\r\n\t]+/g, " ");
  WScript.StdOut.WriteLine(
    [name, status, fmtIso(lastMs), fmtLocal(lastMs), lastRes, fmtLocal(nextMs), xml].join("\t")
  );
}
