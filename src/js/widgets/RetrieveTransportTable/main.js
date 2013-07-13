define(["widget!RetrieveTable","utils"], function(RetrieveTable, utils) {
	var RetrieveTransportTable = function(options){
    this.constr(options);
  };
  utils.inherits(RetrieveTransportTable,RetrieveTable);
  RetrieveTransportTable.prototype.templates = ["main"];
	return RetrieveTransportTable;
});
