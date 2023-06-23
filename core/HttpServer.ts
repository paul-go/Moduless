
namespace Moduless
{
	const Http = require("http") as typeof import("http");
	const Path = require("path") as typeof import("path");
	const Fs = require("fs") as typeof import("fs");
	
	/**
	 * Launches a static HTTP file server at the specified path, from the specified port number.
	 */
	export function createServer(options: {
		path: string,
		port?: number,
		route?: (path: string) => string | Buffer | void
	})
	{
		const server = Http.createServer((req, res) =>
		{
			const path = (req.url || "").replace(/\?.+/, "");
			const joined = Path.join(options.path, path);
			if (!Fs.existsSync(joined))
			{
				res.writeHead(404);
				res.end();
				return;
			}
			
			let size = 0;
			let body: string | Buffer = "";
			
			const maybeOverride = options.route?.(path);
			if (maybeOverride !== undefined)
			{
				size = maybeOverride.length;
				body = maybeOverride;
			}
			else
			{
				const stat = Fs.lstatSync(joined);
				size = stat.size;
				body = Fs.readFileSync(joined);
			}
			
			const mimeType = MimeType.fromFileName(joined) || "text/html";
			
			res.writeHead(200, {
				"Content-Length": size,
				"Content-Type": mimeType
			});
			
			res.end(body);
		});
		
		server.listen(options.port || defaultHttpPort);
	}
	
	export const defaultHttpPort = 54321;
	
	/** */
	export enum MimeType
	{
		unknown = "",
		
		gif = "image/gif",
		jpg = "image/jpeg",
		png = "image/png",
		svg = "image/svg+xml",
		webp = "image/webp",
		avif = "image/avif",
		
		// Videos
		mp4 = "video/mp4",
		webm = "video/av1",
		
		// Zip
		zip = "application/zip",
		
		// Text
		html = "text/html",
		css = "text/css",
		js = "text/javascript",
		ts = "text/plain",
		json = "application/json",
		map = "application/json",
	}
	
	/** */
	export const enum MimeClass
	{
		other = "",
		image = "image",
		video = "video",
	}
	
	/** */
	export namespace MimeType
	{
		const mimes: Map<string, string> = new Map(Object.entries(MimeType)
			.filter(([k, v]) => typeof v === "string") as [string, string][]);
		
		/** */
		export function from(mimeString: string)
		{
			for (const mime of mimes.values())
				if (mime === mimeString)
					return mime as MimeType;
			
			return null;
		}
		
		/** */
		export function getExtension(mimeType: MimeType)
		{
			for (const [ext, mime] of mimes)
				if (mime === mimeType)
					return ext;
			
			return "";
		}
		
		/** */
		export function getClass(mimeType: string)
		{
			const [cls] = mimeType.split("/");
			switch (cls)
			{
				case MimeClass.image: return MimeClass.image;
				case MimeClass.video: return MimeClass.video;
			}
			
			return MimeClass.other;
		}
		
		/**
		 * Parses the specified file name and returns the mime
		 * type that is likely associated with it, based on the file extension.
		 */
		export function fromFileName(fileName: string)
		{
			const ext = fileName.split(".").slice(-1)[0] || "";
			return (mimes.get(ext) || "") as MimeType;
		}
	}
}
