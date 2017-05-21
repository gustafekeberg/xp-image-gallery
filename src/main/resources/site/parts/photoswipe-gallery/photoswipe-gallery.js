var libs = {
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
	util: require('/lib/enonic/util'),
};

exports.get = function(req) {
	var component = libs.portal.getComponent();
	var config = component.config;
	var gallery = libs.content.get({key: config.gallery});
	var data = gallery.data;

	var view = resolve('photoswipe-gallery.html');
	var style = resolve('photoswipe-style.html');
	var pswpAssets = resolve('photoswipe-assets.html');
	var pswpRootEl = resolve('photoswipe-root-el.html')
	var pswpInit = resolve('photoswipe-init.html')
	var images = collectImageData(data.images);
	var userSettings = {
		// showAnimationDuration: 0,
		// hideAnimationDuration: 0,
		// showHideOpacity: true,
		// getThumbBoundsFn: false,
	};
	// var displayHeader = true;
	// 
	var colModel = {
		"1": "col-xs-12",
		"2": "col-xs-6",
		"3": "col-xs-6 col-sm-4 col-md-3",
		"4": "col-xs-6 col-sm-3",
		"6": "col-xs-6 col-sm-3 col-md-2",
		"12": "col-xs-6 col-sm-3 col-md-2 col-lg-1",
	}

	var cols = colModel[config.columns];

	var model = {
		config: config,
		cols: cols,
		name: gallery.displayName,
		tags: data.tags,
		images: images,
		data: data,
		userSettings: JSON.stringify(userSettings)
	};
	var assets = libs.thymeleaf.render(pswpAssets, {});
	var rootEl = libs.thymeleaf.render(pswpRootEl, {});
	var styleEl = libs.thymeleaf.render(style, {});
	// var rootEl = libs.thymeleaf.render(pswpRootEl, {});
	// var init = libs.thymeleaf.render(pswpInit, {});
	var body = libs.thymeleaf.render(view, model);
	return {
		body: body,
		contentType: 'text/html',
		pageContributions: {
			"bodyEnd": [
			rootEl,
			assets,
			styleEl,
			]
		}
	}
}

exports.post = function(req) {
	return req;
}

function collectImageData (list) {
	var array = [];
	for (var i = 0, len = list.length; i < len; i ++ )
	{
		var c = libs.content.get({key: list[i]});
		var data = c.data;
		var media = c.x.media;
		var imageInfo = media.imageInfo;
		var imageData = {
			id: c._id,
			title: c.displayName,
			caption: data.caption,
			artist: data.artist,
			copyright: data.copyright,
			tags: data.tags,
			// data: data,
			// media: media,
			dimensions: [imageInfo.imageWidth, imageInfo.imageHeight],
		}
		array.push(imageData);
	}
	return array;
}
