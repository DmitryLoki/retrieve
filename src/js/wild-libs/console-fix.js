define(function () {
  if (typeof console == 'undefined') {
    var f = function(){};
    console = {
      log:f,
      warn:f,
      error:f
    }
  }
  return console;
});