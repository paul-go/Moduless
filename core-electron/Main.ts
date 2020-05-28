
(async () =>
{
	const Electron = require("electron");// as typeof import("electron");
	const Fs = require("fs") as typeof import("fs");
	
	// We're waiting for 100ms here so that we can give time
	// for the debugger to attach, in the case when we're in
	// debug mode.
	await new Promise(r => setTimeout(r, 100));
	
	const window = new Electron.BrowserWindow({
		title: "Moduless",
		acceptFirstMouse: true,
		alwaysOnTop: true,
		enableLargerThanScreen: true,
		webPreferences: {
			nodeIntegration: true,
			webSecurity: false,
			devTools: true
		}
	});
	
	// Electron is caching scripts loaded from the debug HTTP server
	// fairly aggressively, so we clear everything here.
	window.webContents.session.clearCache();
	window.webContents.session.clearHostResolverCache();
	
	const indexFile = [
		`<!DOCTYPE html>`,
		`<script src="${__dirname}/moduless.js"></script>`,
	].join("\n");
	
	const indexPath = __dirname + "/index.html";
	Fs.writeFileSync(indexPath, indexFile);
	
	await window.webContents.loadURL("file://" + indexPath);
})();
