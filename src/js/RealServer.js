 define(["jquery"],function($) {

	var RealServer = function(options) {
		this.options = options;
	}

	RealServer.prototype.get = function(query) {
		var mult = 1000;
		if (query.type == "race") {
			$.ajax({
				url: "http://api.airtribune.com/v0.1/contest/" + this.options.contestId + "/race/" + this.options.raceId,
				dataType: "json",
				success: function(result) {
					var data = {
						startKey: result.start_time*mult,
						endKey: result.end_time*mult,
						raceKey: result.start_time*mult,
						titles: {
							mainTitle: result.contest_title,
							placeTitle: result.place,
							dateTitle: "",
							taskTitle: result.race_title
						},
						waypoints: []
					}
					var d = new Date();
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
				url: "http://api.airtribune.com/v0.1/contest/" + this.options.contestId + "/race/" + this.options.raceId + "/paragliders",
				dataType: "json",
				success: function(result) {
					var data = [];
					for (var i = 0; i < result.length; i++) {
						var rw = result[i];
//						if (rw.contest_number!="404") continue;
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
				url: "http://api.airtribune.com/v0.1/race/" + this.options.raceId + "/tracks",
				dataType: "json",
				data: {
					from_time: Math.floor(query.first/1000),
					to_time: Math.floor(query.last/1000),
					start_positions: 1
				},
				success: function(result) {
					var data = {start:{},timeline:{}};
					$.each(result.start,function(pilot_id,rw) {
//						if (pilot_id!="404") return;
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
							dt: query.first
						}
					});
					$.each(result.timeline,function(dt,rws) {
						dt *= 1000;
						data.timeline[dt] = {};
						$.each(rws,function(pilot_id,rw) {
//							if (pilot_id != "404") return;
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
						});
					});
					console.log(data);
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