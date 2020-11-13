#!/usr/bin/env node

namespace Moduless
{
	export const inElectronMain = 
		typeof process === "object" && 
		"electronBinding" in process &&
		typeof window === "undefined" &&
		typeof postMessage === "undefined";
	
	export const inElectronRender = 
		typeof process === "object" && 
		"electronBinding" in process &&
		typeof window !== "undefined" &&
		typeof postMessage === "function";
	
	export const inNode = 
		!inElectronMain && 
		!inElectronRender &&
		typeof process === "object" && 
		"binding" in process;
	
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
	
	export const enum Constants
	{
		/**
		 * The prefix that all cover functions must have in their name
		 * in order to be discovered by the moduless cover system.
		 */
		prefix = "cover"
	}
}
