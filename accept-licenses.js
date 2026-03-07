const { spawn } = require('child_process');

const sdkmanager = process.env.LOCALAPPDATA + '\\Android\\Sdk\\cmdline-tools\\latest\\bin\\sdkmanager.bat';
const child = spawn(sdkmanager, ['--licenses'], { shell: true });

child.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    if (output.includes('Accept? (y/N)')) {
        child.stdin.write('y\n');
    }
});

child.stderr.on('data', (data) => {
    console.error(data.toString());
});

child.on('close', (code) => {
    console.log(`License acceptance exited with code ${code}`);
});
