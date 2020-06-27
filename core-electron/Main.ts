
namespace Moduless
{
	export const Electron = require("electron");
	export const Fs = require("fs") as typeof import("fs");
	export const Path = require("path") as typeof import("path");
	
	(async () =>
	{
		// We're waiting for 100ms here so that we can give time
		// for the debugger to attach, in the case when we're in
		// debug mode.
		await new Promise(r => setTimeout(r, 100));
		
		const [x, y] = Settings.lastWindowPosition;
		const [width, height] = Settings.lastWindowSize;
		
		const window = new Electron.BrowserWindow({
			title: "Moduless",
			acceptFirstMouse: true,
			alwaysOnTop: true,
			enableLargerThanScreen: true,
			x,
			y,
			width,
			height,
			webPreferences: {
				nodeIntegration: true,
				webSecurity: false,
				devTools: true
			}
		});
		
		window.on("moved", () =>
		{
			Settings.lastWindowPosition = window.getPosition();
		});
		
		window.on("resize", () =>
		{
			Settings.lastWindowSize = window.getSize();
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
}
