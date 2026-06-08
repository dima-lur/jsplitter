
include(`${fb.ComponentPath}\\docs\\Flags.js`);

utils.RunCmdAsync("cmd.exe", '/c "echo hello && echo err 1>&2"', "", ShowWindow.Hide);
// success: true
// exit_code: 0
// stdout: hello
// stderr: err

utils.RunCmdAsync("cmd.exe", '/c "echo fail 1>&2 & exit /b 7"', "", ShowWindow.Hide);
// success: true
// exit_code: 7
// stderr: fail

utils.RunCmdAsync("cmd.exe", ["/c", "echo hello"], "", ShowWindow.Hide);
// exit_code: 0
// stdout: hello
// stderr: 

utils.RunCmdAsync("cmd.exe", ["/c", "echo", "hello world"]);
// success: true
// exit_code: 0
// stdout: "hello world"
// stderr: 

function on_run_cmd_async_done(task_id, success, exit_code, stdout, stderr) {
    console.log("task_id: " + task_id);
    console.log("success: " + success);
    console.log("exit_code: " + exit_code);
    console.log("stdout: " + stdout);
    console.log("stderr: " + stderr);
}
