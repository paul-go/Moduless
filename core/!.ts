#!/usr/bin/env node

namespace Moduless
{
	export const Fs = require("fs") as typeof import("fs");
	export const Path = require("path") as typeof import("path");
	export const Url = require("url") as typeof import("url");
	
	export const enum Constants
	{
		/**
		 * The prefix that all cover functions must have in their name
		 * in order to be discovered by the moduless cover system.
		 */
		prefix = "cover"
	}
}
