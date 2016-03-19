function jsonp(url, callback) {
	if (jsonp.active_concurrent >= jsonp.max_concurrent) {
		setTimeout(() => jsonp(url, callback), 5);
	} else {
		jsonp.max_past_concurrent = Math.max(++jsonp.active_concurrent, jsonp.max_past_concurrent);
		var callbackSuffix = String.fromCharCode(97 + (jsonp.callback_id++ % 26));
		for (var i = 0; i < Math.floor(jsonp.callback_id / 26); ++i)
			callbackSuffix = "z" + callbackSuffix;
		var callbackName = 'jsonp_callback_' + callbackSuffix;
		window[callbackName] = function(data) {
			delete window[callbackName];
			document.body.removeChild(script);
			callback(data);
			--jsonp.active_concurrent;
		};
		var script = document.createElement('script');
		script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
		document.body.appendChild(script);
	}
}

jsonp.active_concurrent = 0;
jsonp.max_concurrent = 256;
jsonp.max_past_concurrent = 0;
jsonp.callback_id = 0;