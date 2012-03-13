/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

////////////////////////////////////////////////////////////////////////
//
var Montage = 	require("montage/core/core").Montage,
	Component = require("montage/ui/component").Component,
	FileIo = 	require("js/io/system/fileio").FileIo,
	ProjectIo = require("js/io/system/projectio").ProjectIo;
////////////////////////////////////////////////////////////////////////
//
exports.IoMediator = Montage.create(Component, {
	////////////////////////////////////////////////////////////////////
	//
	hasTemplate: {
		enumerable: false,
        value: false
    },
	////////////////////////////////////////////////////////////////////
    //
	deserializedFromTemplate: {
		enumerable: false,
		value: function () {
			//
		}
	},
	////////////////////////////////////////////////////////////////////
    //
    fio: {
    	enumerable: false,
    	value: FileIo
    },
    ////////////////////////////////////////////////////////////////////
    //
    pio: {
    	enumerable: false,
    	value: ProjectIo
    },
    ////////////////////////////////////////////////////////////////////
    //
    getAppTemplatesUrlRegEx: {
    	enumerable: false,
    	value: function () {
    		var regex = new RegExp(chrome.extension.getURL('js/document/templates/montage-html').replace(/\//gi, '\\\/'), 'gi');
    		return regex;
    	}
    },
	////////////////////////////////////////////////////////////////////
    //
    fileNew: {
    	enumerable: false,
    	value: function (file, template, callback) {
    		//Loading template from template URL
    		var xhr = new XMLHttpRequest(), result;
    		xhr.open("GET", template, false);
            xhr.send();
    		if (xhr.readyState === 4) {
    			//Making call to create file, checking for return code
    			switch (this.fio.newFile({uri: file, contents: xhr.response})) {
    				case 201:
    					result = {status: 201, success: true, uri: file};
    					break;
    				case 204:
    					result = {status: 204, success: false, uri: file};
    					break;
    				case 400:
    					result = {status: 400, success: false, uri: file};
    					break;
    				default:
    					result = {status: 500, success: false, uri: file};
    					break;
    			}
    		} else {
    			result = {status: 500, success: false, uri: file};
    		}
    		//Sending result to callback if requested for handling
    		if (callback) callback(result);
    		//Codes
    		//	204: File exists | 400: File exists
		    //	201: File succesfully created | 500: Unknown (Probably cloud API not running)
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //
    fileOpen: {
    	enumerable: false,
    	value: function (file, callback) {
    		//Reading file (Ninja doesn't really open a file, all in browser memory)
    		var read = this.fio.readFile({uri: file}), result;
    		//Checking for status
    		switch(read.status) {
    			case 204:
    				//Creating and formatting result object for callbak
    				result = read.file.details;
    				result.root = read.file.details.uri.replace(read.file.details.name, "");
    				//Checking for type of content to returns
    				if (result.extension !== 'html' && result.extension !== 'htm') {
    					//Simple string
    					result.content = read.file.content;
    				} else {
    					//Object to be used by Ninja Template
						result.content = this.parseHtmlToNinjaTemplate(read.file.content);
    				}
    				//Status of call
    				result.status = read.status;
    				//Calling back with result
    				if (callback) callback(result);
    				break;
    			case 404:
    				//File does not exists
    				if (callback) callback({status: read.status});
    				break;
    			default:
    				//Unknown
    				if (callback) callback({status: 500});
    				break;
    		}
    		/*
    		////////////////////////////////////////////////////////////
    		////////////////////////////////////////////////////////////
    		//Return Object Description
    		Object.status (Always presents for handling)
    		204: File exists (Success)
    		404: File does not exists (Failure)
    		500: Unknown (Probably cloud API not running)
    		
    		(Below only present if succesfull 204)
    		
    		Object.content
    		Object.extension
    		Object.name
    		Object.uri
    		Object.creationDate
    		Object.modifiedDate
    		Object.readOnly
    		Object.size
    		////////////////////////////////////////////////////////////
    		////////////////////////////////////////////////////////////
    		*/
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //
    fileSave: {
    	enumerable: false,
    	value: function (file, callback) {
    		//
    		var contents, save;
    		//
    		switch (file.mode) {
    			case 'html':
    				
    				
    				//TODO: Add check for Monatage library to copy
    				
    				//Getting content from function to properly handle saving assets (as in external if flagged)
    				contents = this.parseNinjaTemplateToHtml(file);
    				break;
    			default:
    				contents = file.content;
    				break;
    		}
    		//Making call to save file
    		save = this.fio.saveFile({uri: file.document.uri, contents: contents});
            //Checking for callback
            if (callback) callback(save);
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //
    fileSaveAs: {
    	enumerable: false,
    	value: function (copyTo, copyFrom, callback) {
    		//TODO: Implement Save As functionality
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //
    fileDelete: {
    	enumerable: false,
    	value: function (file, callback) {
    		//TODO: Implement Delete functionality
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //
    parseHtmlToNinjaTemplate: {
    	enumerable: false,
    	value: function (html) {
    		//Creating temp object to mimic HTML
    		var doc = window.document.implementation.createHTMLDocument(), template;
    		//Setting content to temp
    		doc.getElementsByTagName('html')[0].innerHTML = html;
    		//Creating return object
    		return {head: doc.head.innerHTML, body: doc.body.innerHTML, document: doc};
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //TODO: Expand to allow more templates, clean up variables
    parseNinjaTemplateToHtml: {
    	enumerable: false,
    	value: function (template) {
    		var regexRootUrl, rootUrl = this.application.ninja.coreIoApi.rootUrl+escape((this.application.ninja.documentController.documentHackReference.root.split(this.application.ninja.coreIoApi.cloudData.root)[1]));
    		regexRootUrl = new RegExp(rootUrl.replace(/\//gi, '\\\/'), 'gi');
    		//Injecting head and body into old document
    		template.document.content.document.head.innerHTML = template.head.replace(regexRootUrl, '');
    		template.document.content.document.body.innerHTML = template.body.replace(regexRootUrl, '');
    		//Getting all CSS (style or link) tags
    		var styletags = template.document.content.document.getElementsByTagName('style'),
    			linktags = template.document.content.document.getElementsByTagName('link'),
    			toremovetags = [];
    		//Getting styles tags to be removed from document
    		if (styletags.length) {
    			for (var j=0; j<styletags.length; j++) {
    				if (styletags[j].getAttribute) {
    					if(styletags[j].getAttribute('data-ninja-uri') !== null && !styletags[j].getAttribute('data-ninja-template')) {
    						toremovetags.push(styletags[j]);
    					} else if (styletags[j].getAttribute('data-ninja-external-url')) {
    						toremovetags.push(styletags[j]);
    					}
    				}
    			}
    		}
    		//Removing styles tags from document
    		for (var h=0; toremovetags[h]; h++) {
    			try {
    				//Checking head first
    				template.document.content.document.head.removeChild(toremovetags[h]);
    			} catch (e) {
    				try {
    					//Checking body if not in head
    					template.document.content.document.body.removeChild(toremovetags[h]);
    				} catch (e) {
    					//Error, not found!
    				}
    			}
    		}
    		//Removing disabled tags from tags that were not originally disabled by user (Ninja enables all)
    		for (var l in linktags) {
    			if (linktags[l].getAttribute && linktags[l].getAttribute('disabled')) {//TODO: Use querySelectorAll
    				for (var p=0; toremovetags[p]; p++) {
    					if (toremovetags[p].getAttribute('href') === linktags[l].getAttribute('href')) {
    						if (!toremovetags[p].getAttribute('data-ninja-disabled')) {
    							linktags[l].removeAttribute('disabled');
    						}
    					}
    				}
    			}
    		}
    		//Checking for type of save: styles = <style> only | css = <style> and <link> (all CSS)
    		if (template.styles) {
    			//Getting all style tags
    			var styleCounter = 0,
    				docStyles = template.document.content.document.getElementsByTagName('style');
    			//Looping through all style tags
    			for(var i in template.styles) {
    				if (template.styles[i].ownerNode) {
    					if (template.styles[i].ownerNode.getAttribute) {
    						//Checking for node not to be loaded from file
    						if (template.styles[i].ownerNode.getAttribute('data-ninja-uri') === null && !template.styles[i].ownerNode.getAttribute('data-ninja-template')) {
    							if(docStyles[styleCounter]) {
    								//Inseting data from rules array into tag as string
    								docStyles[styleCounter].innerHTML = this.getCssFromRules(template.styles[i].cssRules);
    								//Syncing <style> tags count since it might be mixed with <link>
    								styleCounter++;
    							}
    						}
    					}
    				}
    			}
    		} else if (template.css) {
    			//Getting all style and link tags
    			var styleCounter = 0,
    				docStyles = template.document.content.document.getElementsByTagName('style'),
    				docLinks = template.document.content.document.getElementsByTagName('link');
    			//Removing Ninja Data Attributes
    			for (var n in docLinks) {
    				if (docLinks[n].attributes) {
    					for (var m in docLinks[n].attributes) {
							if (docLinks[n].attributes[m].name && docLinks[n].attributes[m].name.indexOf('data-ninja')!=-1) {
								docLinks[n].removeAttribute(docLinks[n].attributes[m].name);
							}
						}
    				}
    			}
    			//
    			for(var i in template.css) {
    				if (template.css[i].ownerNode) {
    					if (template.css[i].ownerNode.getAttribute) {
    						if (template.css[i].ownerNode.getAttribute('data-ninja-uri') === null && !template.css[i].ownerNode.getAttribute('data-ninja-template')) {//TODO: Use querySelectorAll
    							//Inseting data from rules array into <style> as string
    							if (docStyles[styleCounter] && !template.css[i].ownerNode.getAttribute('data-ninja-external-url')) {
    								docStyles[styleCounter].innerHTML = this.getCssFromRules(template.css[i].cssRules);
    								styleCounter++;
    							}
    						} else if (!template.css[i].ownerNode.getAttribute('data-ninja-template')){
    							//Checking for attributes to be added to tag upon saving
    							for (var k in docLinks) {
    								if (docLinks[k].getAttribute) {
    									if (docLinks[k].getAttribute('href') && ('/'+docLinks[k].getAttribute('href')) === template.css[i].ownerNode.getAttribute('data-ninja-file-url')) {
    										for (var l in template.css[i].ownerNode.attributes) {
    											if (template.css[i].ownerNode.attributes[l].value) {
    												if (template.css[i].ownerNode.attributes[l].name.indexOf('data-ninja')!=-1) {
    													//Ninja attribute...
    												} else {
    													docLinks[k].setAttribute(template.css[i].ownerNode.attributes[l].name, template.css[i].ownerNode.attributes[l].value);
    												}
    											}
    										}
    									}
    								}
    							}
    														
    							///////////////////////////////////////////////////////////////////////////////////////////
    							///////////////////////////////////////////////////////////////////////////////////////////
    							
    							
    							var cleanedCss,
    								dirtyCss = this.getCssFromRules(template.css[i].cssRules),
    								fileUrl = template.css[i].ownerNode.getAttribute('data-ninja-file-url'),
    								fileRootUrl = this.application.ninja.coreIoApi.rootUrl+fileUrl.split(fileUrl.split('/')[fileUrl.split('/').length-1])[0],
    								cleanedCss = dirtyCss.replace(/(\b(?:(?:https?|ftp|file|[A-Za-z]+):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$]))/gi, parseNinjaUrl.bind(this));
    							  	
    							function parseNinjaUrl (url) {
    								if (url.indexOf(this.application.ninja.coreIoApi.rootUrl) !== -1) {
    									return this.getUrlfromNinjaUrl(url, fileRootUrl, fileUrl);
    								} else {
    									return url;
    								}
    							}
    							
    							///////////////////////////////////////////////////////////////////////////////////////////
    							///////////////////////////////////////////////////////////////////////////////////////////
    							
    							
    							
    							
    							//Saving data from rules array converted to string into <link> file
    							var save = this.fio.saveFile({uri: template.css[i].ownerNode.getAttribute('data-ninja-uri'), contents: cleanedCss});
    							//TODO: Add error handling for saving files
    						}
    					}
    				}
    			}
    		}
    		//Checking for webGL elements in document
    		if (template.webgl && template.webgl.length  > 0) {
    			var rdgeDirName, rdgeVersion;
    			//Copy webGL library if needed
    			for (var i in this.application.ninja.coreIoApi.ninjaLibrary.libs) {
		    		//Checking for RDGE library to be available
		    		if (this.application.ninja.coreIoApi.ninjaLibrary.libs[i].name === 'RDGE') {
		    			rdgeDirName = (this.application.ninja.coreIoApi.ninjaLibrary.libs[i].name+this.application.ninja.coreIoApi.ninjaLibrary.libs[i].version).toLowerCase();
    					rdgeVersion = this.application.ninja.coreIoApi.ninjaLibrary.libs[i].version;
    					this.application.ninja.coreIoApi.ninjaLibrary.copyLibToCloud(template.document.root, rdgeDirName, hackRename.bind(this));
    					//TODO: Remove, this is copying the library into a static name
    					function hackRename (status) {
    						if (status) {
    							setTimeout(function () {
    								this.application.ninja.coreIoApi.copyDirectory({sourceUri: template.document.root+rdgeDirName, destUri: template.document.root+'assets'});
    							}.bind(this), 3000);
    						}
    					}
    				} else {
    					//TODO: Error handle no available library to copy
    				}
    			}
    			//
    			var json, matchingtags = [], webgltag, scripts = template.document.content.document.getElementsByTagName('script'), webgljstag, webgllibtag, webglrdgetag;
    			//
    			for (var i in scripts) {
    				if (scripts[i].getAttribute) {
    					if (scripts[i].getAttribute('data-ninja-webgl') !== null) {//TODO: Use querySelectorAll
    						matchingtags.push(scripts[i]);
    					}
    					if (scripts[i].getAttribute('data-ninja-webgl-js') !== null) {
    						webgljstag = scripts[i]; // TODO: Add logic to delete unneccesary tags
    					}
    					if (scripts[i].getAttribute('data-ninja-webgl-lib') !== null) {
    						webgllibtag = scripts[i]; // TODO: Add logic to delete unneccesary tags
    					}
    					if (scripts[i].getAttribute('data-ninja-webgl-rdge') !== null) {
    						webglrdgetag = scripts[i]; // TODO: Add logic to delete unneccesary tags
    					}
    				}
    			}
    			//
    			if (matchingtags.length) {
    				if (matchingtags.length === 1) {
    					webgltag = matchingtags[0];
    				} else {
    					//TODO: Add logic to handle multiple tags, perhaps combine to one
    					webgltag = matchingtags[matchingtags.length-1]; //Saving all data to last one...
    				}
    			}
    			//
    			if (!webglrdgetag) {
    				webglrdgetag = template.document.content.document.createElement('script');
    				webglrdgetag.setAttribute('type', 'text/javascript');
    				webglrdgetag.setAttribute('src', rdgeDirName+'/rdge-compiled.js');
    				webglrdgetag.setAttribute('data-ninja-webgl-rdge', 'true');
    				template.document.content.document.head.appendChild(webglrdgetag);
    			}
    			//
    			if (!webgllibtag) {
    				webgllibtag = template.document.content.document.createElement('script');
    				webgllibtag.setAttribute('type', 'text/javascript');
    				webgllibtag.setAttribute('src', rdgeDirName+'/canvas-runtime.js');
    				webgllibtag.setAttribute('data-ninja-webgl-lib', 'true');
    				template.document.content.document.head.appendChild(webgllibtag);
    			}
    			//
    			if (!webgltag) {
    				webgltag = template.document.content.document.createElement('script');
    				webgltag.setAttribute('data-ninja-webgl', 'true');
    				template.document.content.document.head.appendChild(webgltag);
    			}
    			//TODO: Remove this tag and place inside JS file
    			if (!webgljstag) {
    				webgljstag = template.document.content.document.createElement('script');
    				webgljstag.setAttribute('type', 'text/javascript');
    				webgljstag.setAttribute('data-ninja-webgl-js', 'true');
    				template.document.content.document.head.appendChild(webgljstag);
    			}
    			//TODO: Decide if this should be over-writter or only written on creation
    			var rootElement = 'document.body'; //TODO: Set actual root element
    			webgljstag.innerHTML = "\
//Loading webGL/canvas data on window load\n\
window.addEventListener('load', loadWebGL, false);\n\
function loadWebGL (e) {\n\
	window.removeEventListener('load', loadWebGL, false);\n\
	//Calling method to initialize all webGL/canvas(es)\n\
	initWebGl("+rootElement+", '"+rdgeDirName+"/');\n\
}\
    			";
    			//TODO: This data should be saved to a JSON file eventually
    			json = '\n({\n\t"version": "'+rdgeVersion+'",\n\t"directory": "'+rdgeDirName+'/",\n\t"data": [';
    			//Looping through data to create escaped array
    			for (var j=0; template.webgl[j]; j++) {
    				if (j === 0) {
    					json += '\n\t\t\t"'+escape(template.webgl[j])+'"';
    				} else {
    					json += ',\n\t\t\t"'+escape(template.webgl[j])+'"';
    				}
    			}
    			//Closing array (make-shift JSON string to validate data in <script> tag)
    			json += '\n\t\t]\n})\n';
    			//Setting string in tag
    			webgltag.innerHTML = json;
    		}
    		//Cleaning URLs from HTML
    		var cleanHTML = template.document.content.document.documentElement.outerHTML.replace(/(\b(?:(?:https?|ftp|file|[A-Za-z]+):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$]))/gi, parseNinjaRootUrl.bind(this));
    		//
    		function parseNinjaRootUrl (url) {
    			if (url.indexOf(this.application.ninja.coreIoApi.rootUrl) !== -1) {
    				return this.getUrlfromNinjaUrl(url, rootUrl, rootUrl.replace(new RegExp((this.application.ninja.coreIoApi.rootUrl).replace(/\//gi, '\\\/'), 'gi'), '')+'file.ext');
    			} else {
    				return url;
    			}
    		}
    		//
    		return this.getPrettyHtml(cleanHTML.replace(this.getAppTemplatesUrlRegEx(), ''));
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //
    getUrlfromNinjaUrl: {
    	enumerable: false,
    	value: function (url, fileRootUrl, fileUrl) {
    		//console.log("Params: ", url, fileRootUrl, fileUrl);
    		//console.log("Getting: " + url);
    		//
    		if (url.indexOf(fileRootUrl) !== -1) {
    			url = url.replace(new RegExp(fileRootUrl.replace(/\//gi, '\\\/'), 'gi'), '');
    		} else {
    			//TODO: Clean up vars
    			var assetsDirs = (url.replace(new RegExp((this.application.ninja.coreIoApi.rootUrl).replace(/\//gi, '\\\/'), 'gi'), '')).split('/');
    			var fileDirs = (fileUrl.split(fileUrl.split('/')[fileUrl.split('/').length-1])[0]).split('/');
    			var counter = 0;
    			var path = '';
    			var newURL = '';
    			//
    			for (var p=0; p < fileDirs.length-1; p++) {
    				if (fileDirs[p] === assetsDirs[p]) {
    					counter++;
    				}
    			}
    			//
    			for (var p=0; p < (fileDirs.length-counter)-1; p++) {
    				path += '../';
    			}
    			//
    			for (var p=counter; p < assetsDirs.length; p++) {
    				newURL += '/'+assetsDirs[p];
    			}
    			//
   				url = (path+newURL).replace(/\/\//gi, '/');
   			}
    		//console.log("Returning: " + url);
    		//console.log("-----");
    		//
    		return url;
    	}
    },
    ////////////////////////////////////////////////////////////////////
    //Method to return a string from CSS rules (to be saved to a file)
    getCssFromRules: {
    	enumerable: false,
    	value: function (list) {
    		//Variable to store CSS definitions
    		var i, str, css = '';
    		//Looping through list
    		if (list && list.length > 0) {
    			//Adding each list item to string and also adding breaks
    			for (i = 0; list[i]; i++) {
    				css += list[i].cssText;
    			}
    		}
    		//Returning the CSS string
    		return this.getPrettyCss(css.replace(this.getAppTemplatesUrlRegEx(), ''));
    	}
    },
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    //Pretty methods (minified)
    /*
		is-beautify javascript code courtesy of Einar Lielmanis:
		Code from https://github.com/einars/js-beautify
		License https://github.com/einars/js-beautify/blob/master/license.txt
		Used with author's permission, as stated below
		
		Copyright (c) 2009 - 2011, Einar Lielmanis
		Permission is hereby granted, free of charge, to any person
		obtaining a copy of this software and associated documentation
		files (the "Software"), to deal in the Software without
		restriction, including without limitation the rights to use,
		copy, modify, merge, publish, distribute, sublicense, and/or sell
		copies of the Software, and to permit persons to whom the
		Software is furnished to do so, subject to the following
		conditions:The above copyright notice and this permission notice shall be
		included in all copies or substantial portions of the Software.
	*/
    //For HTML, including any JS or CSS (single string/file)
    getPrettyHtml: {
    	enumerable: false,
    	value: function (a,b){function h(){this.pos=0;this.token="";this.current_mode="CONTENT";this.tags={parent:"parent1",parentcount:1,parent1:""};this.tag_type="";this.token_text=this.last_token=this.last_text=this.token_type="";this.Utils={whitespace:"\n\r\t ".split(""),single_token:"br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed".split(","),extra_liners:"head,body,/html".split(","),in_array:function(a,b){for(var c=0;c<b.length;c++){if(a===b[c]){return true}}return false}};this.get_content=function(){var a="";var b=[];var c=false;while(this.input.charAt(this.pos)!=="<"){if(this.pos>=this.input.length){return b.length?b.join(""):["","TK_EOF"]}a=this.input.charAt(this.pos);this.pos++;this.line_char_count++;if(this.Utils.in_array(a,this.Utils.whitespace)){if(b.length){c=true}this.line_char_count--;continue}else if(c){if(this.line_char_count>=this.max_char){b.push("\n");for(var d=0;d<this.indent_level;d++){b.push(this.indent_string)}this.line_char_count=0}else{b.push(" ");this.line_char_count++}c=false}b.push(a)}return b.length?b.join(""):""};this.get_contents_to=function(a){if(this.pos==this.input.length){return["","TK_EOF"]}var b="";var c="";var d=new RegExp("</"+a+"\\s*>","igm");d.lastIndex=this.pos;var e=d.exec(this.input);var f=e?e.index:this.input.length;if(this.pos<f){c=this.input.substring(this.pos,f);this.pos=f}return c};this.record_tag=function(a){if(this.tags[a+"count"]){this.tags[a+"count"]++;this.tags[a+this.tags[a+"count"]]=this.indent_level}else{this.tags[a+"count"]=1;this.tags[a+this.tags[a+"count"]]=this.indent_level}this.tags[a+this.tags[a+"count"]+"parent"]=this.tags.parent;this.tags.parent=a+this.tags[a+"count"]};this.retrieve_tag=function(a){if(this.tags[a+"count"]){var b=this.tags.parent;while(b){if(a+this.tags[a+"count"]===b){break}b=this.tags[b+"parent"]}if(b){this.indent_level=this.tags[a+this.tags[a+"count"]];this.tags.parent=this.tags[b+"parent"]}delete this.tags[a+this.tags[a+"count"]+"parent"];delete this.tags[a+this.tags[a+"count"]];if(this.tags[a+"count"]==1){delete this.tags[a+"count"]}else{this.tags[a+"count"]--}}};this.get_tag=function(){var a="";var b=[];var c=false;do{if(this.pos>=this.input.length){return b.length?b.join(""):["","TK_EOF"]}a=this.input.charAt(this.pos);this.pos++;this.line_char_count++;if(this.Utils.in_array(a,this.Utils.whitespace)){c=true;this.line_char_count--;continue}if(a==="'"||a==='"'){if(!b[1]||b[1]!=="!"){a+=this.get_unformatted(a);c=true}}if(a==="="){c=false}if(b.length&&b[b.length-1]!=="="&&a!==">"&&c){if(this.line_char_count>=this.max_char){this.print_newline(false,b);this.line_char_count=0}else{b.push(" ");this.line_char_count++}c=false}b.push(a)}while(a!==">");var d=b.join("");var e;if(d.indexOf(" ")!=-1){e=d.indexOf(" ")}else{e=d.indexOf(">")}var f=d.substring(1,e).toLowerCase();if(d.charAt(d.length-2)==="/"||this.Utils.in_array(f,this.Utils.single_token)){this.tag_type="SINGLE"}else if(f==="script"){this.record_tag(f);this.tag_type="SCRIPT"}else if(f==="style"){this.record_tag(f);this.tag_type="STYLE"}else if(this.Utils.in_array(f,unformatted)){var g=this.get_unformatted("</"+f+">",d);b.push(g);this.tag_type="SINGLE"}else if(f.charAt(0)==="!"){if(f.indexOf("[if")!=-1){if(d.indexOf("!IE")!=-1){var g=this.get_unformatted("-->",d);b.push(g)}this.tag_type="START"}else if(f.indexOf("[endif")!=-1){this.tag_type="END";this.unindent()}else if(f.indexOf("[cdata[")!=-1){var g=this.get_unformatted("]]>",d);b.push(g);this.tag_type="SINGLE"}else{var g=this.get_unformatted("-->",d);b.push(g);this.tag_type="SINGLE"}}else{if(f.charAt(0)==="/"){this.retrieve_tag(f.substring(1));this.tag_type="END"}else{this.record_tag(f);this.tag_type="START"}if(this.Utils.in_array(f,this.Utils.extra_liners)){this.print_newline(true,this.output)}}return b.join("")};this.get_unformatted=function(a,b){if(b&&b.indexOf(a)!=-1){return""}var c="";var d="";var e=true;do{if(this.pos>=this.input.length){return d}c=this.input.charAt(this.pos);this.pos++;if(this.Utils.in_array(c,this.Utils.whitespace)){if(!e){this.line_char_count--;continue}if(c==="\n"||c==="\r"){d+="\n";this.line_char_count=0;continue}}d+=c;this.line_char_count++;e=true}while(d.indexOf(a)==-1);return d};this.get_token=function(){var a;if(this.last_token==="TK_TAG_SCRIPT"||this.last_token==="TK_TAG_STYLE"){var b=this.last_token.substr(7);a=this.get_contents_to(b);if(typeof a!=="string"){return a}return[a,"TK_"+b]}if(this.current_mode==="CONTENT"){a=this.get_content();if(typeof a!=="string"){return a}else{return[a,"TK_CONTENT"]}}if(this.current_mode==="TAG"){a=this.get_tag();if(typeof a!=="string"){return a}else{var c="TK_TAG_"+this.tag_type;return[a,c]}}};this.get_full_indent=function(a){a=this.indent_level+a||0;if(a<1)return"";return Array(a+1).join(this.indent_string)};this.printer=function(a,b,c,d,e){this.input=a||"";this.output=[];this.indent_character=b;this.indent_string="";this.indent_size=c;this.brace_style=e;this.indent_level=0;this.max_char=d;this.line_char_count=0;for(var f=0;f<this.indent_size;f++){this.indent_string+=this.indent_character}this.print_newline=function(a,b){this.line_char_count=0;if(!b||!b.length){return}if(!a){while(this.Utils.in_array(b[b.length-1],this.Utils.whitespace)){b.pop()}}b.push("\n");for(var c=0;c<this.indent_level;c++){b.push(this.indent_string)}};this.print_token=function(a){this.output.push(a)};this.indent=function(){this.indent_level++};this.unindent=function(){if(this.indent_level>0){this.indent_level--}}};return this}var c,d,e,f,g;b=b||{};d=b.indent_size||4;e=b.indent_char||" ";g=b.brace_style||"collapse";f=b.max_char||"999999";unformatted=b.unformatted||["a"];c=new h;c.printer(a,e,d,f,g);while(true){var i=c.get_token();c.token_text=i[0];c.token_type=i[1];if(c.token_type==="TK_EOF"){break}switch(c.token_type){case"TK_TAG_START":c.print_newline(false,c.output);c.print_token(c.token_text);c.indent();c.current_mode="CONTENT";break;case"TK_TAG_STYLE":case"TK_TAG_SCRIPT":c.print_newline(false,c.output);c.print_token(c.token_text);c.current_mode="CONTENT";break;case"TK_TAG_END":if(c.last_token==="TK_CONTENT"&&c.last_text===""){var j=c.token_text.match(/\w+/)[0];var k=c.output[c.output.length-1].match(/<\s*(\w+)/);if(k===null||k[1]!==j)c.print_newline(true,c.output)}c.print_token(c.token_text);c.current_mode="CONTENT";break;case"TK_TAG_SINGLE":c.print_newline(false,c.output);c.print_token(c.token_text);c.current_mode="CONTENT";break;case"TK_CONTENT":if(c.token_text!==""){c.print_token(c.token_text)}c.current_mode="TAG";break;case"TK_STYLE":case"TK_SCRIPT":if(c.token_text!==""){c.output.push("\n");var l=c.token_text;if(c.token_type=="TK_SCRIPT"){var m=typeof js_beautify=="function"&&js_beautify}else if(c.token_type=="TK_STYLE"){var m=typeof this.getPrettyCss=="function"&&this.getPrettyCss}if(b.indent_scripts=="keep"){var n=0}else if(b.indent_scripts=="separate"){var n=-c.indent_level}else{var n=1}var o=c.get_full_indent(n);if(m){l=m(l.replace(/^\s*/,o),b)}else{var p=l.match(/^\s*/)[0];var q=p.match(/[^\n\r]*$/)[0].split(c.indent_string).length-1;var r=c.get_full_indent(n-q);l=l.replace(/^\s*/,o).replace(/\r\n|\r|\n/g,"\n"+r).replace(/\s*$/,"")}if(l){c.print_token(l);c.print_newline(true,c.output)}}c.current_mode="TAG";break}c.last_token=c.token_type;c.last_text=c.token_text}return c.output.join("")}
    },
    //For CSS (single string/file)
    getPrettyCss: {
    	enumerable: false,
    	value: function (a,b){function t(){r--;p=p.slice(0,-c)}function s(){r++;p+=q}function o(a,b){return u.slice(-a.length+(b||0),b).join("").toLowerCase()==a}function n(){var b=g;i();while(i()){if(h=="*"&&j()=="/"){g++;break}}return a.substring(b,g+1)}function m(){var a=g;do{}while(e.test(i()));return g!=a+1}function l(){var a=g;while(e.test(j()))g++;return g!=a}function k(b){var c=g;while(i()){if(h=="\\"){i();i()}else if(h==b){break}else if(h=="\n"){break}}return a.substring(c,g+1)}function j(){return a.charAt(g+1)}function i(){return h=a.charAt(++g)}b=b||{};var c=b.indent_size||4;var d=b.indent_char||" ";if(typeof c=="string")c=parseInt(c);var e=/^\s+$/;var f=/[\w$\-_]/;var g=-1,h;var p=a.match(/^[\r\n]*[\t ]*/)[0];var q=Array(c+1).join(d);var r=0;print={};print["{"]=function(a){print.singleSpace();u.push(a);print.newLine()};print["}"]=function(a){print.newLine();u.push(a);print.newLine()};print.newLine=function(a){if(!a)while(e.test(u[u.length-1]))u.pop();if(u.length)u.push("\n");if(p)u.push(p)};print.singleSpace=function(){if(u.length&&!e.test(u[u.length-1]))u.push(" ")};var u=[];if(p)u.push(p);while(true){var v=m();if(!h)break;if(h=="{"){s();print["{"](h)}else if(h=="}"){t();print["}"](h)}else if(h=='"'||h=="'"){u.push(k(h))}else if(h==";"){u.push(h,"\n",p)}else if(h=="/"&&j()=="*"){print.newLine();u.push(n(),"\n",p)}else if(h=="("){u.push(h);l();if(o("url",-1)&&i()){if(h!=")"&&h!='"'&&h!="'")u.push(k(")"));else g--}}else if(h==")"){u.push(h)}else if(h==","){l();u.push(h);print.singleSpace()}else if(h=="]"){u.push(h)}else if(h=="["||h=="="){l();u.push(h)}else{if(v)print.singleSpace();u.push(h)}}var w=u.join("").replace(/[\n ]+$/,"");return w}
    }
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
});
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////