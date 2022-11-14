#!/usr/bin/env node

namespace Moduless
{
	export const inElectronMain = 
		typeof process === "object" &&
		(process as any).type === "browser";
	
	export const inElectronRender = 
		typeof process === "object" &&
		(process as any).type === "renderer";
	
	export const inNode =
		!inElectronMain &&
		!inElectronRender &&
		typeof process === "object" &&
		process.release.name === "node";
	
	/**
	 * Gets whether the host environment is a browser, whether that is
	 * an actual browser window, or an electron render process.
	 */
	export const inBrowser = 
		!inElectronMain && 
		!inNode && 
		typeof window !== "undefined" &&
		typeof postMessage === "function";
	
	export const Fs = require("fs") as typeof import("fs");
	export const Path = require("path") as typeof import("path");
	export const Url = require("url") as typeof import("url");
	export const Electron = (inElectronMain || inElectronRender) ?
		require("electron") :
		{};
}
