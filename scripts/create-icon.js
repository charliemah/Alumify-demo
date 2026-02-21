const fs = require("fs");
const path = require("path");
const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQz0AEYBxVSF+FABJADqkNHasOAAAAAElFTkSuQmCC";
fs.writeFileSync(path.join(__dirname, "../apps/mobile/assets/icon.png"), Buffer.from(b64, "base64"));
