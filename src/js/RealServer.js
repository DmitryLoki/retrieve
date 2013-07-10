 define(["jquery"],function($) {

	var RealServer = function(options) {
		this.options = options;
	}

	RealServer.prototype.setOption = function(i,v) {
		this.options[i] = v;
	}

	RealServer.prototype.get = function(query) {
		var mult = 1000;
		if (query.type == "race") {
			$.ajax({
				url: "http://api.airtribune.com/" + this.options.apiVersion + "/contest/" + this.options.contestId + "/race/" + this.options.raceId,
				dataType: "json",
				success: function(result,textStatus,request) {
					var data = {
						startKey: result.start_time*mult,
						endKey: result.end_time*mult,
						raceKey: result.start_time*mult,
						timeoffset: result.timeoffset,
						titles: {
							mainTitle: result.contest_title,
							placeTitle: result.country + ", " + result.place,
							dateTitle: "",
							taskTitle: result.race_title
						},
						waypoints: [],
						serverKey: (new Date(request.getResponseHeader("Date"))).getTime()
					}
					var d = new Date(data.startKey);
//					data.titles.dateTitle = d.toDateString();
					var m_ar = "Jan Fab Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(/ /);
					data.titles.dateTitle = d.getDate() + " " + m_ar[d.getMonth()] + ", " + d.getFullYear();
					if (result.checkpoints && result.checkpoints.features) {
						for (var i = 0; i < result.checkpoints.features.length; i++) {
							rw = result.checkpoints.features[i];
							data.waypoints.push({
								id: i,
								name: rw.properties.name,
								type: rw.properties.checkpoint_type,
								center: {
									lat: rw.geometry.coordinates[0],
									lng: rw.geometry.coordinates[1]
								},
								radius: rw.properties.radius,
								openKey: rw.properties.open_time*mult
							});
							if (rw.properties && rw.properties.checkpoint_type == "ss")
								data.raceKey = rw.properties.open_time*mult;
						}
					}
					// костыль: убираем названия у тех цилиндров, у которых есть другой цилиндр с тем же центром и бОльшим радиусом
					for (var i = 0; i < data.waypoints.length; i++) {
						for (var j = i+1; j < data.waypoints.length; j++) {
							if (Math.abs(data.waypoints[i].center.lat-data.waypoints[j].center.lat) + Math.abs(data.waypoints[i].center.lng-data.waypoints[j].center.lng) < 0.0001) {
								if (data.waypoints[i].radius < data.waypoints[j].radius)
									data.waypoints[j].name = "";
								else
									data.waypoints[i].name = "";
							}
						}
					}

					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
		else if (query.type == "ufos") {
			var getRandomColor = function() {
				var letters = "0123456789ABCDEF".split("");
			    var color = "#";
    			for (var i = 0; i < 6; i++ )
			        color += letters[Math.round(Math.random() * 15)];
    			return color;
			}
			$.ajax({
				url: "http://api.airtribune.com/" + this.options.apiVersion + "/contest/" + this.options.contestId + "/race/" + this.options.raceId + "/paragliders",
				dataType: "json",
				success: function(result) {
					var data = [];
					for (var i = 0; i < result.length; i++) {
						var rw = result[i];
//						if (rw.contest_number!="80") continue;
						data.push({
							id: rw.contest_number,
							personId: rw.person_id,
							name: rw.name,
							country: rw.country,
							color: getRandomColor()
						});
					}
					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
		else if (query.type == "timeline") {
			$.ajax({
//				url: "http://api.airtribune.com/" + this.options.apiVersion + "/race/" + this.options.raceId + "/tracks",
				url: "http://api.airtribune.com/" + this.options.apiVersion + "/track/group/" + this.options.raceId + (query.isOnline||this.options.isOnline?"_online":""),
				dataType: "json",
				data: {
					from_time: Math.floor(query.first/1000),
					to_time: Math.floor(query.last/1000),
					start_positions: 1
				},
				success: function(result,textStatus,request) {
					if (!result.start) result.start = {};
					var data = {start:{},timeline:{}}, tmp = {};
					data.serverKey = (new Date(request.getResponseHeader("Date"))).getTime();
					$.each(result.start,function(pilot_id,rw) {
//						if (pilot_id!="80") return;
						data.start[pilot_id] = {
							dist: rw.dist,
							gspd: rw.gspd,
							vspd: rw.vspd,
							position: {
								lat: rw.lat,
								lng: rw.lon
							},
							alt: rw.alt,
							state: rw.state,
							stateChangedAt: rw.statechanged_at,
							dt: query.first
						}
						tmp[pilot_id] = {state:rw.state,stateChangedAt:rw.statechanged_at};
					});
					$.each(result.timeline,function(dt,rws) {
						dt *= 1000;
						data.timeline[dt] = {};
						$.each(rws,function(pilot_id,rw) {
//							if (pilot_id != "80") return;
							data.timeline[dt][pilot_id] = {
								dist: rw.dist,
								gspd: rw.gspd,
								vspd: rw.vspd,
								position: {
									lat: rw.lat,
									lng: rw.lon
								},
								alt: rw.alt,
								state: rw.state,
								dt: dt
							}
							if (rw.state) {
								data.timeline[dt][pilot_id].stateChangedAt = Math.floor(dt/1000);
								tmp[pilot_id] = {state:rw.state,stateChangedAt:Math.floor(dt/1000)};
							}
							else if (tmp[pilot_id]) {
								data.timeline[dt][pilot_id].state = tmp[pilot_id].state;
								data.timeline[dt][pilot_id].stateChangedAt = tmp[pilot_id].stateChangedAt;
							}
						});
					});
					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
		else if (query.type == "sms") {
			var data = {};
			if (query.lastSmsTimestamp) data.from_time = query.lastSmsTimestamp + 1; // здесь прибавляем 1 чтобы было не включительно (чтобы последняя смс не приходила снова и снова)
			$.ajax({
				url: "http://apidev.airtribune.com/chatroom/" + this.options.raceId,
//				url: "http://apidev.airtribune.com/chatroom/r-7dc4d514-aa6b-44cb-b515-18cec12d8691",
				dataType: "json",
				data: data,
				success: function(result) {
					if (query.callback)
						query.callback(result);
				}
			});
		}
	}

	RealServer.prototype.post = function(query) {
		console.log("post",query);
		if (query.type == "sms") {
			var ajax = $.ajax({
				url: "http://apidev.airtribune.com/chatroom/" + this.options.raceId,
//				url: "http://apidev.airtribune.com/chatroom/r-7dc4d514-aa6b-44cb-b515-18cec12d8691",
				type: "POST",
				dataType: "json",
				data: {
					from: query.data.from,
					to: query.data.to,
					sender: query.data.sender,
					body: query.data.body
				},
				success: function(result) {
					if (query.callback)
						query.callback({success:1});
				},
				error: function(result) {
					if (query.callback)
						query.callback({error:1});
				}
			});
		}
		return ajax;
	}

	return RealServer;
});