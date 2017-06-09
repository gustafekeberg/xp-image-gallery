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
	var siteConfig = libs.portal.getSiteConfig();

	// get selected gallery or try to find gallery at current location if no selection exists
	var selectedGallery =	config.gallery ? libs.content.get({ key: config.gallery }) :	libs.content.get({ key: content._id });

	// Display message if no gallery is selected or found on current location
	if (selectedGallery.type !== app.name + ":gallery") {
		var notFound = "<div><p><strong>Gallery not found!</strong></p><p>Please check your settings!</p></div>";
		return {
			body: notFound,
		};
	}
	// Data and setup for gallery
	var data = selectedGallery.data;
	var design = config.design || siteConfig.design;
	var style = design ? libs.content.get({
		key: design
	}) : undefined;

	// parse and prepare data
	var styleConf = style ? style.data : undefined; // get style data
	var styleModel = prepareStyle(styleConf); // prepare style data
	var images = collectImageData({list: data.images});

	// Parse settings to pass on to image viewer
	var userSettings = (styleConf && styleConf.viewer) ? PSWPUserSettings (styleConf.viewer) : undefined;

	// Setup thymeleaf model for part
	var model = {
		config: config,
		style: styleModel,
		name: selectedGallery.displayName,
		tags: data.tags,
		images: images,
		data: data,
		userSettings: JSON.stringify(userSettings),
	};
	// libs.util.log(styleModel);
	// Get view and render part-body
	var view = resolve('gallery.html');
	var body = libs.thymeleaf.render(view, model);

	var bodyEnd = [];
	if (styleModel.viewer)
	{	
		// Render pageContributions for image viewer
		var addStyle = resolve('style.html');
		var pswpAssets = resolve('assets.html');
		var pswpRootEl = resolve('root-el.html');
		var contriButions = [
			libs.thymeleaf.render(pswpAssets, {}),
			libs.thymeleaf.render(pswpRootEl, {}),
			libs.thymeleaf.render(addStyle, {}),
		];
		bodyEnd = bodyEnd.concat(contriButions);
	}

	return {
		body: body,
		contentType: 'text/html',
		pageContributions: {
			"bodyEnd": bodyEnd
		}
	};
};

exports.post = function(req) {
	return req;
};

function prepareStyle(styleConf) {

	function combineStyles (defaultStyle, customStyle) {
		var combined = defaultStyle;
		for (var key in customStyle)
		{
			combined[key] = customStyle[key];
		}
		return combined;
	}

	var defaultStyle = {
		grid: "bootstrap3",
		cols: (styleConf && styleConf.columns) ? getColsetup(styleConf) : "col-xs-12",
		thumbnails: thumbnailsDefaultSettings(),
		viewer: {},
	};
	var combinedStyle = combineStyles(defaultStyle, styleConf);
	return combinedStyle;
}
function thumbnailsDefaultSettings () {
	return {
		"_selected": [
		"click",
		"captions",
		"shape",
		"style",
		"size"
		],
		"click": {
			"action": "image"
		},
		"captions": {
			"captions": {
				"_selected": "include",
				"include": {
					"title": true,
					"artist": false,
					"copyright": false,
					"artistPreText": "Artist:"
				}
			}
		},
		"shape": {
			"dimensions": "original"
		},
		"style": {
			"shape": "img-original",
			"vAlign": false
		},
		"size": {
			"size": "small"
		}
	};
}

function PSWPUserSettings (json) {
	/*
	Parse settings
	*/

	// Return if no pswp settings exist
	if (!json || !json.pswp)
		return;
	var pswp = json.pswp;

	// Settings that are available in PSWP
	var availablePSWPUserSettings = {
		showHideOpacity: true,
		showAnimationDuration: 0,
		hideAnimationDuration: 0,
		bgOpacity: 0,
		barsSize: {
			top: 44,
			bottom: 'auto'
		},
		closeEl: true,
		captionEl: false,
		fullscreenEl: true,
		zoomEl: true,
		shareEl: false,
		counterEl: true,
		arrowEl: true,
		preloaderEl: true,
		spacing: 0.12,
		shareButtons: [{
			id: 'facebook',
			label: 'Share on Facebook',
			url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}'
		}, {
			id: 'twitter',
			label: 'Tweet',
			url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'
		}, {
			id: 'pinterest',
			label: 'Pin it',
			url: 'http://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}'
		}, {
			id: 'download',
			label: 'Download image',
			url: '{{raw_image_url}}',
			download: true
		}],
	};
	var controls = pswp.controls;
	var PSWPUserSettings = {};
	if (controls)
	{
		// Set different controls to true/false if exists or not
		PSWPUserSettings = {
			closeEl: controls.close ? true : false,
			captionEl: controls.caption ? true : false,
			fullscreenEl: controls.fullscreen ? true : false,
			zoomEl: controls.zoom ? true : false,
			shareEl: controls.share ? true : false,
			counterEl: controls.counter ? true : false,
			arrowEl: controls.arrow ? true : false,
			preloaderEl: controls.preloader ? true : false,
			shareButtons: controls.share ? parseShareButtons(controls.share) : undefined,
		};
	}
	return PSWPUserSettings;
}
function parseShareButtons (c) {
	var array = [];
	var media = c.media;
	var custom = c.custom;
	if (media)
		media = forceArray(media);
	if (custom)
		custom = forceArray(custom);
	var preDefShareBtns = {
		'facebook': {
			id: 'facebook',
			label: 'Share on Facebook',
			url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}'
		}, 
		'twitter': {
			id: 'twitter',
			label: 'Tweet',
			url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}'
		},
		'pinterest': {
			id: 'pinterest',
			label: 'Pin it',
			url: 'http://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}'
		},
		'download': {
			id: 'download',
			label: 'Download image',
			url: '{{raw_image_url}}',
			download: true
		}};

		for (var i in media)
		{
			var key = media[i];
			array.push(preDefShareBtns[key]);
		}
		if (custom)
			array = array.concat(custom);
		return array;
	}

	function getColsetup(config) {
		var defaultSetup = "col-xs-12";
		var cssClass = "";
		if (!config || !config.columns)
			return defaultSetup;
		// get column styles from config
		var colStyles = config.columns;

		// force array of selected styles
		var selected = forceArray(colStyles._selected);
		for (var i = 0, len = selected.length; i < len; i++) {
			// get screensize specific style
			var screenSize = selected[i];

			var size = colStyles[screenSize];
			// construct CSS class if size setting exists
			if (size)
				cssClass += screenSize + "-" + size.col + " ";
		}
		return cssClass;
	}

	function collectImageData(params) {
	/*
	Create array over images and image data from list of image id's
	*/
	
	var list = params.list,
	ratio = params.ratio || 'org',
	size = params.size || 'md';
	if (!list)
		return;
	if (ratio == 'cust' && !params.dimension)
		ratio = 'org';
	function imageSizes (ratio, size, dimension) {

		var ratios = {
			org: '',
			r1_1: '',
			r2_1: '',
			r3_2: '',
			r5_4: '',
			cust: '',
		};
		var sizes = {
			xs: '',
			sm: '',
			md: '',
			lg: '',
			cust: ''
		};
		return;
	}

	var array = [];
	for (var i = 0, len = list.length; i < len; i++) {
		var current = libs.content.get({
			key: list[i]
		});
		var data = current.data;
		var media = current.x.media;
		var imageInfo = media.imageInfo;
		var dimensions = [imageInfo.imageWidth, imageInfo.imageHeight];

		var imageData = {
			id: current._id,
			title: current.displayName,
			caption: data.caption,
			artist: data.artist,
			copyright: data.copyright,
			tags: data.tags,
			// data: data,
			// media: media,
			dimensions: dimensions,
		};
		array.push(imageData);
	}
	return array;
}

function forceArray(o) {
	return libs.util.data.forceArray(o);
}
