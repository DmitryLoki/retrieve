 define(["jquery"],function($) {

	var RealServer = function(options) {
		this.options = options;
	}

	RealServer.prototype.get = function(query) {
		var mult = 1000;
		if (query.type == "race") {
			$.ajax({
				url: "http://api.airtribune.com/" + this.options.apiVersion + "/contest/" + this.options.contestId + "/race/" + this.options.raceId,
				dataType: "json",
				success: function(result) {
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
						waypoints: []
					}
					var d = new Date(data.startKey);
					data.titles.dateTitle = d.toDateString();
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
			$.ajax({
				url: "http://api.airtribune.com/" + this.options.apiVersion + "/contest/" + this.options.contestId + "/race/" + this.options.raceId + "/paragliders",
				dataType: "json",
				success: function(result) {
					var data = [];
					for (var i = 0; i < result.length; i++) {
						var rw = result[i];
//						if (rw.contest_number!="20") continue;
						data.push({
							id: rw.contest_number,
							name: rw.name,
							country: rw.country
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
				url: "http://api.airtribune.com/" + this.options.apiVersion + "/track/group/" + this.options.raceId,
				dataType: "json",
				data: {
					from_time: Math.floor(query.first/1000),
					to_time: Math.floor(query.last/1000),
					start_positions: 1
				},
				success: function(result) {
					var data = {start:{},timeline:{}}, tmp = {};
					$.each(result.start,function(pilot_id,rw) {
//						if (pilot_id!="20") return;
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
//							if (pilot_id != "20") return;
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
					console.log("real server data",data);
					if (query.callback)
						query.callback(data);
				},
				error: function(jqXHR,textStatus,errorThrown) {
					if (query.error)
						query.error(jqXHR,textStatus,errorThrown);
				}
			});
		}
	}

	return RealServer;
});