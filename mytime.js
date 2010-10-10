/*
 MyTime - MySource Matrix Performance Timing v1.0
 http://www.mysourceusers.com/mytime
 
 Copyright 2010, Anton Babushkin (babushkin.anton@gmail.com)
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var MyTime = {
  jsAPIKey: null, /* int: can be found on the details screen of your JS API */
  parentID: "", /* string: assets are created here */
  newLinkID: null, /* int: assets are new linked here */
  metadataFieldID: null, /* int: used for saving metadata */
  spinnerImageURL: null, /* optional, but if supplied the spinner will be displayed to the user instead of just having text */
  maxRuns: 2, /* the amount of times these tests should run */
  sleepTime: 15, /* the sleep time between each iteration (in seconds) */
  timeoutDelay: 30, /* the amount of time (in seconds) that an action has to send some data to the server before it is retried (excluding sleep time) */
  timeoutMaxRetries: 5, /* the amount of retries each action can have before we move on to the next one in the queue */
  timeoutMaxExecutionTime: 123, /* the amount of time (in seconds) an action has to finish executing an action before it is aborted and retried */
  thinkTimeEnabled: false, /* determined whether think time should be used between actions. recommended to turn on if these tests are run with lots of concurrent users. */
	thinkTimeDefault: 5, /* the default time between actions */
	debug: false, /* enabling debug will create a consistent sleep time between actions */
  logDebug: true, /* whether or not messages should be logged, helps when testing with sleepTime, this will default to true if debug mode is enabled */
  debugSleepTime: 5, 
  randomize: { /* ensures that the assets and their create locations are randomized, this is especially useful when you have different types of triggers setup in different areas of your site(s) */
    enabled: false,
    thinkTimeRandom: false,
    thinkTimeRandomMultiplier: 1.5,
    parentID: [ ],
    newLinkID: [ ]
  },
  queue: [], /* queued actions */
  CONSTANTS: {
    SUCCESS: 1,
    FAIL: 2,
    STATUS_LIVE: 16
  },
  GLOBALS: {
    currentRun: 0, /* automatically incremented by the queue so that we know how many times the tests have run */
    timeoutTimerID: null, /* the timeout timer ID for each action as set by setTimeout or setInterval */
    thinkTimerID: null, /* the think timer ID for each action as set by setInterval */
    createdID: null /* the first action creates an asset, the asset ID of that new asset is stored and re-used */
  },
  jobComplete: function(status, message){
    this.timeoutStop();
    var currentJob = queue.current();
    if (status == this.CONSTANTS.SUCCESS) {
      currentJob.endTime = new Date();
      if (!message) {
        message = "<strong>" + currentJob.actionName + "</strong> successfully completed";
      }
      this.logMessage((currentJob.endTime - currentJob.startTime) / 1000, message);
      queue.next();
    }
    else {
      if (!message) {
        message = "<strong>" + currentJob.actionName + "</strong> failed to complete";
      }
      this.logMessage((currentJob.endTime - currentJob.startTime) / 1000, message);
      queue.repeat();
    }
  },
  logMessage: function(timeTaken, message){
    var time = this.getTimestamp();
    
    if (!isNaN(timeTaken)) {
      $("#log").append("<li>" + time + " - " + message + " time: <span>" + timeTaken + " seconds</span></li>");
    }
    else {
      message = timeTaken;
      $("#log").append("<li>" + time + " - " + message + "</li>");
    }
  },
  timeoutBegin: function(thinkTime){
    clearInterval(this.GLOBALS.timeoutTimerID);
    this.GLOBALS.timeoutTimerID = setInterval("MyTime.timeoutCheckStatus()", (this.timeoutDelay + thinkTime) * 1000);   
  },
  timeoutCheckStatus: function(){
    var currentJob = queue.current();
    if ( ((new Date() - currentJob.startTime) / 1000) < this.timeoutMaxExecutionTime ) {
      if (currentJob.status == "running" && typeof(currentJob.xhr.readyState) == "undefined") {
        this.logDebug("Retrying - Exceded maximum time before an action's AJAX request is sent...");
        this.logDebug(currentJob);
        this.logDebug("xhr.readyState: " + currentJob.xhr.readyState);
        queue.repeat();
      }
    }
    // the job has executed it's maximum execution time, retry it
    else {
      if (currentJob.status == "running" || currentJob.xhr.readyState <= 2) {
        this.logDebug("Retrying - Maximum execution time has been exceded");
        this.logDebug(currentJob);
        this.logDebug("xhr.readyState: " + currentJob.xhr.readyStatus);
        this.logDebug("Execution time: " + ((new Date() - currentJob.startTime) / 1000));
        queue.repeat();
      }
    }
  },
  timeoutStop: function(){
    clearInterval(this.GLOBALS.timeoutTimerID);
    this.GLOBALS.timeoutTimerID = null; 
  },
  thinkCountDownBegin: function(thinkTime){
    if (thinkTime > 0) {
      $("#thinkTimer").text(thinkTime);
      this.logMessage("Sleeping for " + thinkTime + " seconds before next action...");
      this.GLOBALS.thinkTimerID = setInterval("MyTime.thinkCountDownUpdate()", 1000);
    }
  },
  thinkCountDownUpdate: function(){
    var $thinkTimer = $("#thinkTimer");
    var current = parseInt($thinkTimer.text());
    if (current > 0) {
      $thinkTimer.text(current - 1);
    }
    else {
      this.thinkCountDownStop();
    }   
  },
  thinkCountDownStop: function(){
    if (this.GLOBALS.thinkTimerID) {
      clearInterval(this.GLOBALS.thinkTimerID);
      this.GLOBALS.thinkTimerID = null;
    }
  },
  getTimestamp: function(){
    var date = new Date();
    var seconds = (date.getSeconds().toString().length > 1) ? date.getSeconds() : "0" + date.getSeconds();
    var minutes = (date.getMinutes().toString().length > 1) ? date.getMinutes() : "0" + date.getMinutes();
    return date.getHours() + ":" + minutes + ":" + seconds;
  },
  logDebug: function(message) {
    if (this.debug && typeof(console) != "undefined") {
      console.log(message);
    } 
  }
};

$(document).ready(function(){
  window.api_key = MyTime.jsAPIKey;
  var assetName = $("#username").text();
  
  if (assetName.length == 0) {
    assetName = "Unknown User";
  }
  
  // no "Run" button has been coded into the Page, create one from scratch
  if ($("#run").length == 0) {
    $("body").append("<button id='run'>Run tests</button>");
  }
  else {
    $("#run").attr("disabled", false);
    $("#run").val("Run tests");
  }
  
  // create divs hold the progress and log information
  var spinner = (MyTime.spinnerImageURL) ? "<img src='" + MyTime.spinnerImageURL + "' />" : "<strong>Running tests...</strong>";
  $("body").append("<div id='progress' style='display: none'>" + spinner + " <span></span></div><div id='log'></div>");
  
  // Create asset
  queue(function(){
    try {
      var parentID = MyTime.parentID;

      if (MyTime.randomize.enabled && MyTime.randomize.parentID.length > 0) {
        parentID = MyTime.randomize.parentID[Math.floor(Math.random() * MyTime.randomize.parentID.length)];
      }

      createAsset(parentID, "page_standard", assetName + " - " + Math.uuid(5), 1, "", -1, 0, 0, 0, "", function(data){
        MyTime.GLOBALS.createdID = parseInt(data.id);
        if (isNaN(MyTime.GLOBALS.createdID)) {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }
        else {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);
    }
  }, 90, null, "createAsset()");
  
  // Get children ()
  queue(function(){
    try {
      getChildren(MyTime.parentID, 0, function(data){
        if (data.length > 0 || typeof(data) == "object") {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
        else {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }       
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);     
    }
  }, 60, null, "getChildren()");  
    
  // Acquire lock (details)
  // Using this legacy API due to the fact that Matrix's JS API doesn't work with "contents" or "details" screen locks
  queue(function(){
    jmx(MyTime.GLOBALS.createdID).acquireLock("details", function(data){
      if (data == "success") {                          
        MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
      }
      else {
        MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
      }
    });
  }, 60, null, "jmx().acquireLock(details)");
  
  // Get contents
  queue(function(){
    jmx(MyTime.GLOBALS.createdID).getContents({
      success: function(data){
        if (typeof(data) != "boolean") {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
      },
      error: function(message){
        if (typeof(data) != "boolean") {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }
      }
    });
  }, 0, null, "jmx().getContents()");
  
  // Save contents
  // TODO:
  // Fix API to include better error handling for this action
  queue(function(){
    jmx(MyTime.GLOBALS.createdID).content.bodycopies[0].value = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis nisl leo, condimentum a malesuada vitae, scelerisque quis ligula. Duis non libero nunc, eu mollis nulla. Nunc eu arcu magna, sit amet ullamcorper quam. Mauris auctor purus eu dui luctus eget auctor risus sollicitudin. Nullam velit nibh, bibendum eget posuere in, fringilla non tellus. Integer nec ante lacus, et tristique tortor. Vivamus egestas pulvinar nulla, ac malesuada mi viverra at. Sed eleifend pellentesque accumsan. Pellentesque vel libero enim. Pellentesque eget ante nulla. Ut nec diam metus, non ullamcorper massa. Proin blandit ullamcorper accumsan.</p>";
    
    jmx(MyTime.GLOBALS.createdID).saveContents(function(data){
      MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
    });
  }, 180, null, "jmx().saveContents()");  
  
  // Preview contents
  queue(function(){
    try {
      $.get(window.location.href + "/_nocache", { a: MyTime.GLOBALS.createdID }, function(data){
        MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);
    }
  }, 30, null, "Non API - previewContents()");

  // Get contents
  queue(function(){
    jmx(MyTime.GLOBALS.createdID).getContents({
      success: function(data){
        if (typeof(data) != "boolean") {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
      },
      error: function(message){
        if (typeof(data) != "boolean") {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }
      }
    });
  }, 60, null, "jmx().getContents()");

  // Save contents
  queue(function(){
    jmx(MyTime.GLOBALS.createdID).content.bodycopies[0].value = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis nisl leo, condimentum a malesuada vitae, scelerisque quis ligula. Duis non libero nunc, eu mollis nulla. Nunc eu arcu magna, sit amet ullamcorper quam. Mauris auctor purus eu dui luctus eget auctor risus sollicitudin. Nullam velit nibh, bibendum eget posuere in, fringilla non tellus. Integer nec ante lacus, et tristique tortor. Vivamus egestas pulvinar nulla, ac malesuada mi viverra at. Sed eleifend pellentesque accumsan. Pellentesque vel libero enim. Pellentesque eget ante nulla. Ut nec diam metus, non ullamcorper massa. Proin blandit ullamcorper accumsan.</p><p>Morbi ligula magna, ornare in euismod non, elementum vitae eros. Nunc eu felis lectus. Ut non nulla rutrum augue molestie imperdiet at et magna. Cras leo nisl, cursus quis hendrerit ut, aliquet vitae mi. In a volutpat mi. Quisque auctor nunc vitae massa lobortis nec feugiat mi mollis. Sed neque tellus, molestie eget venenatis in, fringilla at turpis. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nulla malesuada, risus quis varius lobortis, odio lacus lacinia magna, a gravida felis nulla quis nisl. Sed mattis commodo sapien, sed mollis metus ultrices vel. Duis varius, ligula nec ultricies pharetra, enim nulla viverra sapien, non adipiscing sem sem vitae nisi. Duis porta massa quis leo ornare facilisis et ultricies erat. In cursus turpis in nisi ultrices varius. Morbi vel urna id mauris scelerisque ornare quis non mi. In ante leo, consectetur et pulvinar sed, vehicula sed nisi.</p>";
    
    jmx(MyTime.GLOBALS.createdID).saveContents(function(data){
      MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
    });
  }, 180, null, "jmx().saveContents()");  
  
  // Release locks (contents)
  queue(function(){
    try {
      releaseLock(MyTime.GLOBALS.createdID, "content", function(data){
        if (data.length > 0) {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
        else {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);     
    }
  }, 20, null, "releaseLock(content)"); 
  
  // Acquire lock (metadata)
  queue(function(){
    acquireLock(MyTime.GLOBALS.createdID, "metadata", false, false, function(data){
      if (data[0].search("locks are now acquired") > -1) {
        MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
      }
      else {
        MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
      }
    });
  }, 60, null, "acquireLock(metadata)");
  
  // Get metadata
  queue(function(){
    jmx(MyTime.GLOBALS.createdID).getMetadata({
      success: function(data){
        MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
      },
      error: function(message){
        MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
      }
    });
  }, 0, null, "jmx().getMetadata()");
  
  // Save metadata
  queue(function(){
    setMetadata(MyTime.GLOBALS.createdID, MyTime.metadataFieldID, "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis nisl leo, condimentum a malesuada vitae, scelerisque quis ligula. Duis non libero nunc, eu mollis nulla.", function(data){ 
      if (typeof(data.success) != "undefined") {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
      }
      else {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
      }
    }); 
  }, 180, null, "setMetadata()");

  // Release locks (metadata)
  queue(function(){
    try {
      releaseLock(MyTime.GLOBALS.createdID, "metadata", function(data){
        if (data.length > 0) {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
        else {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }       
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);
    }
  }, 20, null, "releaseLock(metadata)");  
  
  // Get children () - in the new link location
  queue(function(){
    try {
      getChildren(MyTime.newLinkID, 0, function(data){
        if (data.length > 0 || typeof(data) == "object") {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
        else {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }       
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message); 
    }
  }, 30, null, "getChildren()");
  
  // Create new link
  queue(function(){
    try {
      createLink(MyTime.newLinkID, MyTime.GLOBALS.createdID, 1, "", -1, 0, 0, function(data){
        if (data.length > 0 || typeof(data) == "object") {
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);       
        }
        else {
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }
      });
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);
    }
  }, 20, null, "createLink()"); 
  
  // Change asset status (Under Construction > Live)
  // Only if available, otherwise this action will be skipped
  queue(function(){
    try {
      if (typeof(setAssetStatus) != "undefined") {
        setAssetStatus(MyTime.GLOBALS.createdID, MyTime.CONSTANTS.STATUS_LIVE, false, "", function(data){
          if (data[0].search("successfully to Live") > -1) {
            MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
          }
          else {
            MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);
          }
        });
      }
      else {
        MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
      }
    }
    catch (e) {
      MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message); 
    }
  }, 30, null, "setAssetStatus()");
  
  /****
    These calls will create load on the server but we cannot measure them because we save the results on the asset
  ****/
  // First lets check that at least one metadata field has been defined for an action
  // If it hasn't then these calls are useless and don't need to be run
  var saveRequired = false;
  for (var counter = 0; counter < MyTime.queue.length; counter++) {
    if (MyTime.queue[counter].metadataFieldID) {
      saveRequired = true;
      break;
    }
  }
  
  if (saveRequired) { 
    queue(function(){
      jmx(MyTime.GLOBALS.createdID).getMetadata({
        success: function(data){
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        },
        error: function(){
          MyTime.jobComplete(MyTime.CONSTANTS.FAIL);
        }
      });   
    }, 0, null, "Save results - jmx().getMetadata()");

    // send the performance figures to metadata values on the asset
    // for the time being will always default to the legacy API
    // older versions of Matrix didn't allow you to save multiple metadata values
    queue(function(){
      // all the performance values are saved to a unique metadata field
      for (var counter = 0; counter < MyTime.queue.length; counter++) {
        var job = MyTime.queue[counter];
        if (job.metadataFieldID) {
          var metadata = jmx(MyTime.GLOBALS.createdID).metadata(job.metadataFieldID);
          metadata.use_default = false;
          metadata.value = (job.endTime - job.startTime) / 1000;
        }
      }

      jmx(MyTime.GLOBALS.createdID).saveMetadata({
        success: function(){
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        }
      });
    }, 0, null, "Save results - jmx().saveMetadata()");
  
    // release the final lock
    queue(function(){
      try {
        releaseLock(MyTime.GLOBALS.createdID, "metadata", function(data){
          MyTime.jobComplete(MyTime.CONSTANTS.SUCCESS);
        });
      }
      catch (e) {
        MyTime.jobComplete(MyTime.CONSTANTS.FAIL, e.message);     
      }
    }, 0, null, "Save results - releaseLock()");
  }
  
  $("#run").attr("disabled", false).text("Run");
  $("#run").bind("click", function(){
    $(this).attr("disabled", true);
    queue.start();
  });
  
  if (window.location.href.search("autoStart=true") > -1) {
    MyTime.logMessage("Automatically starting tests");
    $("#run").attr("disabled", true);
    queue.start();
  }
});

/**
  Monitoring methods that help us keep track of all XMLHttpRequests.
  These are useful in making sure that if the queue retries a particular action that all older actions are cancelled (to avoid to actions running in parallel).
**/

var newSend = function(a) {
  var xhr = this;
  var currentJob = queue.current();
  if (currentJob) {
    currentJob.xhr = xhr;
  }
  xhr.oldSend(a);
}

if (window.XMLHttpRequest) {
  XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = newSend;
}

/**
  Main methods for handling the queuing of each job
**/

function queue(action, thinkTime, metadataFieldID, actionName){
  MyTime.queue.push({
    status: "queued",
    action: action,
    retried: 0,
    xhr: null,
    id: Math.uuid(),
    startTime: null,
    endTime: null,
    thinkTime: thinkTime,
    metadataFieldID: metadataFieldID,
    actionName: (typeof(actionName) != "undefined") ? actionName : null
  });
};

queue.start = function(){
  // reset all statuses to "queued"
  $.each(MyTime.queue, function(i, v){
    this.status = "queued";
  });
  
  // display some pretty messages for the user
  $("#progress img").show();  
  
  // start the queue
  MyTime.GLOBALS.currentRun++;
  if (MyTime.GLOBALS.currentRun > MyTime.maxRuns) {
    queue.finish();
  }
  else {
    MyTime.queue[0].status = "running";
    MyTime.queue[0].action();
    MyTime.queue[0].startTime = new Date();
    
    // set a timeout timer
    MyTime.timeoutBegin(MyTime.queue[0].thinkTime);
    
    // create div to monitor think time
    $("body").append("<div id='thinkTimer' style='border: 1px solid black; width: 100px; height: 50px; text-align: center; vertical-align: middle; line-height: 50px; font-weight: bold; font-size: 27px; position: absolute; right: 10px; top: 10px;'></div>");
    $("#progress").show();
  }
};

queue.next = function(){
  // stop the count down
  MyTime.thinkCountDownStop();
  var thinkTime = null;
  var repeatSleepTime = MyTime.sleepTime;
  
  $.each(MyTime.queue, function(i, v){
    if (this.status == "running") {
      
      if (!MyTime.thinkTimeEnabled) {
        thinkTime = MyTime.thinkTimeDefault;
        repeatSleepTime = MyTime.thinkTimeDefault;
      }
      
      // last item
      if (i == (MyTime.queue.length - 1)) {
        // start another cycle
        if (MyTime.GLOBALS.currentRun < MyTime.maxRuns) {
          MyTime.logMessage("Sleeping for " + repeatSleepTime + " seconds before another iteration...");
          setTimeout("queue.start()", repeatSleepTime * 1000);
        }
        // finish up the tests
        else {
          queue.finish();
        }
      } // end last item
      // not the last item in the queue
      else {
        // finish up the current job
        this.status = "finished";
        
        // and now move on to the next one in the queue
        MyTime.queue[i+1].status = "running";
        
        if (!thinkTime) {
          thinkTime = queue.current().thinkTime;
          if (MyTime.randomize.thinkTimeRandom) {
            MyTime.logDebug("Randomizing think time...");
            
            var maximum = thinkTime * MyTime.randomize.thinkTimeRandomMultiplier;
            MyTime.logDebug("Minimum: " + thinkTime);
            MyTime.logDebug("Maximum: " + maximum);
            var randNumber = Math.floor(Math.random() * (maximum - thinkTime));
            MyTime.logDebug("New random sleep time = " + randNumber);
            
            // if the thinkTime is 0 then we assume that this is a fixed time
            if (thinkTime == 0) {
              MyTime.logDebug("Default think time is 0. Think time unchanged.");
            }
            else {
              thinkTime += randNumber;
              MyTime.logDebug("Think time incremented. New value = " + thinkTime);
            }
          }
        }

        // create a timeout timer for each job
        MyTime.timeoutBegin(thinkTime);
        
        // show the user some feedback about the sleep time before the next action
        MyTime.thinkCountDownBegin(thinkTime);

        // update the progress percentage to give the user some feedback
        if (MyTime.GLOBALS.currentRun > 1) {
          var x = MyTime.queue.length + i;
        }
        else {
          var x = i;
        }
        var percentage = Math.floor(x / (MyTime.queue.length * MyTime.maxRuns) * 100);
        
        $("#progress span").text(percentage + "% complete");
        if (percentage == 100) {
          queue.finish();
        }

        // schedule the job
        setTimeout(function(){
          var current = queue.current();
          current.startTime = new Date();
          current.action();
        }, thinkTime * 1000); 
      }
      
      return false;
    }
  });
};

queue.finish = function(){
  MyTime.GLOBALS.currentRun = 0;
  $("#progress img").hide();
  $("#progress span").css("font-weight", "bold").text("Tests complete.");
  jmx.asset.instances = []; // flush all information about the assets for a clean run next time round
  $("form").remove(); // remove any forms that are still on the page (my JS api has a bug)
  MyTime.timeoutStop(); // stop any timeout timers just in case
  // useful if you want to have endless amount of repeats for the tests
  if (window.location.href.search("repeat=true") > -1) {
    window.location.reload(true);
  }
};

// incase an item in the queue didn't execute (if the server is temporarily down)
queue.repeat = function(){
  var currentJob = queue.current();
  currentJob.retried++;
  if (currentJob.retried < MyTime.timeoutMaxRetries) {
    MyTime.timeoutStop();
    currentJob.xhr.abort();
    currentJob.action();
    currentJob.startTime = new Date();
    MyTime.logMessage("<strong>Retrying previous action due to timeout.</strong>");
  }
  else {
    MyTime.logMessage("Sorry but the test needs to restart. This page will reload and restart the test automatically in 5 seconds.");
    // first check to make sure that the paramter of "autoStart" doesn't exist in the URL
    // this ensures that we don't get double paramters posted, i.e. autoStart=true?autoStart=true
    var href = (window.location.href.indexOf("?") == 0) ? window.location.href += "?autoStart=true" : window.location.href;
    setTimeout(window.location.href = href, 5000);
  }
};

queue.current = function(){
  var current = null;
  for (var counter = 0; counter < MyTime.queue.length; counter++) {
    var c = MyTime.queue[counter];
    if (c.status == "running") {
      current = c;
      break;
    }
  }
  
  return current;
};