define(['utils'], function(utils){
	function i18nDict(val){ // val = {'ru': {'Hello': 'Привет', 'OK': 'Ладно', ...}, 'it': {...
		if(val)
			i18nDict.val = val;
		if(!i18nDict.val)
			i18nDict.val = {};
		return i18nDict.val;
	}

	function i18nLocale(val){ // val = 'ru'
		if(val)
			i18nLocale.val = val;
		return i18nDict.val;
	}

	function i18nTrans(key, locale){
		locale = locale || i18nLocale.val;
		if(!i18nDict.val || !i18nDict.val[locale] || !i18nDict.val[locale][key]){
			utils.log('[filter:i18nTrans] "' + key + '" not found in locale "' + locale + '".');
			return key;
		}
		else
			return i18nDict.val[locale][key];
	}

	function trunc(text, len){
		text = text();
		if(text.length <= len)
			return text;
		else
			return text.substr(0, len) + '...';
	}

	function dateFormatFull(str){
		str = str();
		var arr = /^\D*(\d\d\d\d)\D(\d\d?)\D(\d\d?)\D(\d\d?)\D(\d\d?)\D(\d\d?).*$/.exec(str);
		if(!arr)
			throw 'dateFormatFull filter input error!';
		return arr[3] + ' ' + i18nTrans('%i18n:dateFormat%').monthNamesShort[parseInt(arr[2], 10) - 1].toLowerCase() + ' ' + arr[1] + ' - ' + arr[4] + ':' + arr[5];
	}

	function zz(n){
		return n < 10 ? '0' + n : '' + n;
	}
	
	function formatTime(date){
		if(date instanceof Date)
			return zz(date.getHours()) + ':' + zz(date.getMinutes()) + ':' + zz(date.getSeconds());
		else
			return '';
	}

	return {
		i18nDict: i18nDict,
		i18nLocale: i18nLocale,
		i18nTrans: i18nTrans,
		trunc: trunc,
		dateFormatFull: dateFormatFull,
		formatTime: formatTime
	};
});