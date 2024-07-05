import fs from "node:fs";
import { exec } from "node:child_process";

function incVersion() {
  const srcPath = "./public/manifest.json";
  const file = fs.readFileSync(srcPath, "utf8");
  const data = JSON.parse(file);
  const label = process.argv[2];

  if (label) {
    let [major, minor, patch] = data.version.split(".").map(num => parseInt(num, 10));

    if (label === "patch") {
      patch += 1;
    }
    else if (label === "minor") {
      minor += 1;
      patch = 0;
    }
    else if (label === "major") {
      major += 1;
      minor = 0;
      patch = 0;
    }
    data.version = `${major}.${minor}.${patch}`;

    fs.writeFileSync(srcPath, JSON.stringify(data, null, 2) + "\n");
    fs.writeFileSync("./dist/manifest.json", fs.readFileSync(srcPath));
  }
  return data.version;
}

function zipDist(version) {
  exec(`cd dist && zip -r initium-${version}.zip *`, (error, stdout, stderr) => {
    console.log(`stdout:\n${stdout}`);

    if (error !== null) {
      console.log(`stderr: ${stderr}`);
      console.log(`exec error: ${error}`);
    }
  });
}

const version = incVersion();
zipDist(version);
