const fs = require("fs");
const { exec } = require('child_process');

function incVersion() {
    const srcPath = "./src/manifest.json";
    const file = fs.readFileSync(srcPath, "utf8");
    const data = JSON.parse(file);
    const label = process.argv[2];
    let [major, minor, patch] = data.version.split(".").map(num => parseInt(num, 10));

    if (label === "patch") {
        patch += 1;
    }
    else if (label === "minor") {
        minor += 1;
    }
    else if (label === "major") {
        major += 1;
    }
    data.version = `${major}.${minor}.${patch}`;

    fs.writeFileSync(srcPath, JSON.stringify(data, null, 4));
    fs.writeFileSync("./dist/manifest.json", fs.readFileSync(srcPath));
    return data.version;
}

function zipDist(version) {
    exec(`cd dist && zip -r initium-${version} *`, (error, stdout, stderr) => {
        console.log(`stdout: ${stdout}`);

        if (error !== null) {
            console.log(`stderr: ${stderr}`);
            console.log(`exec error: ${error}`);
        }
    });
}

(function build() {
    const version = incVersion();

    zipDist(version);
})();
