/**
	Monitoring methods that help us keep track of all XMLHttpRequests.
	These are useful in making sure that if the queue retries a particular action that all older actions are cancelled (to avoid to actions running in parallel).
**/

XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send;

var newSend = function(a) {
  var xhr = this;
	
  var onload = function() {
    console.log("XMLHttpRequest Complete");
  };
		
  var onerror = function() {
	console.log("XMLHttpRequest Error");
  };
		
  xhr.addEventListener("load", onload, false);
  xhr.addEventListener("error", onerror, false);
  
  queue.current().xhr = xhr;

  xhr.oldSend(a);
}

XMLHttpRequest.prototype.send = newSend;