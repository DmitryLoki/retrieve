define(['setImmediate'], function(setImmediate){
	var nextTick = setImmediate;

	function Walk(val){
		this._task = { procs: [] };
		this._lastTask = this._task;
		this._count = 0;
		this._val = val;
		this._errProcs = [];
	}

	Walk.prototype._updateTasks = function(){
		if(this._err){
			for(var i = 0; i < this._errProcs.length; i++){
				this._count ++;
				nextTick(this._errProcs[i].bind(this, this._err));
			}
			this._errProcs = [];
			return;
		}

		var self = this;

		function procWrap(){
			var stepData = {
				walk: self,
				val: self._val,
			};
			stepData.next = function(err){
				if(self._err)
					return;
				if(err)
					self._err = err;
				else{
					self._val = stepData.val;
					self._count --;
				}
				self._updateTasks();
			};

			this.call(stepData, stepData);
		};

		for(var i = 0; i < this._task.procs.length; i++){
			this._count ++;
			nextTick(procWrap.bind(this._task.procs[i]));
		}
		this._task.procs = [];

		if(!this._count && this._task.next){
			this._task = this._task.next;
			this._updateTasks();
		}
	};

	Walk.prototype.step = function(proc){
		if(this._err)
			return this;
		this._lastTask.procs.push(proc);
		this._updateTasks();
		return this;
	};

	Walk.prototype._waitPrevTask = function(){
		var prevTask = this._lastTask;
		this._lastTask = { procs: [] };
		prevTask.next = this._lastTask;
		return this;
	};

	Walk.prototype.error = function(proc){
		this._errProcs.push(proc);
		this._updateTasks();
		return this;
	};

	Walk.prototype.wait = function(proc){
		if(this._err)
			return this;
		this._waitPrevTask();
		if(proc)
		{
			this.step(proc);
			this._waitPrevTask();
		}
		return this;
	};

	function walk(val){
		return new Walk(val);
	}

	return walk;
});
