var libs = {
	portal: require('/lib/xp/portal'),
	content: require('/lib/xp/content'),
	thymeleaf: require('/lib/xp/thymeleaf'),
	util: require('/lib/enonic/util'),
};

exports.get = function(req) {
	var component = libs.portal.getComponent();
	var content = libs.portal.getContent();
	var config = component.config;
	var selectedGallery = config.gallery;

	// get selected gallery or try this location if no gallery is selected
	var gallery = selectedGallery ? libs.content.get({key: selectedGallery}) : libs.content.get({key: content._id});
	if (gallery.type !== app.name + ":gallery")
	{
		var notFound = "<div><p><strong>Gallery not found!</strong></p><p>Please check your settings!</p></div>";	
		return {
			body: notFound,
		};
	}
	var data = gallery.data;

	var view = resolve('gallery.html');
	var style = resolve('style.html');
	var pswpAssets = resolve('assets.html');
	var pswpRootEl = resolve('root-el.html');
 
	var images = collectImageData(data.images);
	var availableUserSettings = {
		showHideOpacity: true,
		showAnimationDuration: 0,
		hideAnimationDuration: 0,
		bgOpacity: 0,
		barsSize: {top: 44, bottom:'auto'}, 
		closeEl: true,
		captionEl: false,
		fullscreenEl: true,
		zoomEl: true,
		shareEl: false,
		counterEl: true,
		arrowEl: true,
		preloaderEl: true,
		spacing: 0.12,
		shareButtons: [
	    {id:'facebook', label:'Share on Facebook', url:'https://www.facebook.com/sharer/sharer.php?u={{url}}'},
	    {id:'twitter', label:'Tweet', url:'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'},
	    {id:'pinterest', label:'Pin it', url:'http://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}'},
	    {id:'download', label:'Download image', url:'{{raw_image_url}}', download:true}
		],
	};

	var userSettings = {
		// bgOpacity: 0.5,
	};

	var galleryStyle = config.grid ? libs.content.get({
		key: config.grid
	}) : undefined;
	var galleryStyleData = (galleryStyle ? galleryStyle.data : undefined);
	var colSetup = getColsetup(galleryStyleData);
	// libs.util.log(colSetup);

	var model = {
		config: config,
		cols: colSetup,
		name: gallery.displayName,
		tags: data.tags,
		images: images,
		data: data,
		userSettings: JSON.stringify(userSettings),
		displayFigcaptions: config.displayFigcaptions,
		verticalAlign: config.verticalAlign,
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
	};
};

exports.post = function(req) {
	return req;
};

function getColsetup(config) {
	var defaultSetup = "col-xs-12";
	var setup = "";
	if (!config || !config.columnStyle)
		return defaultSetup;
	var colStyle = config.columnStyle;
	var selected = libs.util.data.forceArray(colStyle._selected);
	for (var i = 0, len = selected.length; i < len; i++) {
		var key = selected[i];
		setup += key + "-" + colStyle[key].col + " ";
	}
	return setup;
}

function collectImageData(list) {
	var array = [];
	for (var i = 0, len = list.length; i < len; i++) {
		var c = libs.content.get({
			key: list[i]
		});
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
		};
		array.push(imageData);
	}
	return array;
}
