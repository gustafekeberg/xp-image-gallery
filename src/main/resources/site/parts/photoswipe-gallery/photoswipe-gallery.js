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
	var pswpAssets = resolve('photoswipe-assets.html');
	var pswpRootEl = resolve('photoswipe-root-el.html')
	var pswpInit = resolve('photoswipe-init.html')

	var model = {
		name: gallery.displayName,
		tags: data.tags,
		images: data.images,
		data: data,
	};
	var assets = libs.thymeleaf.render(pswpAssets, {});
	var rootEl = libs.thymeleaf.render(pswpRootEl, {});
	// var init = libs.thymeleaf.render(pswpInit, {});
	var body = libs.thymeleaf.render(view, model);
	return {
		body: body,
		contentType: 'text/html',
		pageContributions: {
			"bodyEnd": [
			rootEl,
			assets,
			]
		}
	}
}

exports.post = function(req) {
	return req;
}
