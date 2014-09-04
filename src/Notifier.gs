var email = "example@google.com"; // The e-mail address updates will be sent to
var subject = "GE Updated"; // Subject of the e-mail update
var message = "The GE updated around now.."; // Message of the e-mail update

var IDS = [237, 1517, 554, 453, 1617, 1515, 62]; // GE item IDs to check for changes (the GE updates items in a rolling window, not all at once - so we check a few different IDs for changes.)
/*
This variable IDS is defined outside of any single function, so it is a "global variable".
Any function can access or modify it at runtime and other functions will be able to see and use those values
The name of the variable is in capital letters to signify that it should remain unchanged, or "final"
This is an array with the IDs of items we’ll check
*/

var LINK = 'http://services.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item='; // this is the link, just stored it so we don’t have to copy/paste is everywhere
/*
This variable LINK is defined outside of any single function, so it too is a "global variable".
Any function can access or modify it at runtime and other functions will be able to see and use those values
The name of the variable is in capital letters to signify that it should remain unchanged, or "final"
This is a string containing the base of the API link, basically just a shortcut so you don't have to have long links throughout the script
*/

/*
The outcome of this function hasGEUpdated() is one of two things, "true" or "false". True if the GE has updated or false if it has not
Calling it from another function will see this value, so.. "var status = hasGEUpdated();" would assign true or false to the variable status

I'll explain what the function does step by step, line by line..

1. We'll establish that the GE has not updated, as we do not know any better yet. We can and will change this as we go along
2. We'll get the last time we recorded the GE updating from ScriptProperties. The property name we'll get is "lastUpdate".
   ScriptProperties returns this as a String, so we have to cast it to a number by enclosing it in the "Number()" constructor
   If lastUpdate does not exist, ScriptProperties will return null. We don't want to assign null to lastUpdate, so we'll use || (OR) to assign 0 instead
3. We'll assign the current time to the variable "date" by making a new Date() object, and calling its function getTime() to return the milliseconds since January 1, 1970

4. This is a for loop, everything inside its brackets runs over and over as long as the for loops test parameter evaluates "true"
   The for loops parameters are separated by semicolons ; there are three parameters in total
     a.  var i = 0, stop = 0
     b.  i < IDS.length
     c.  i++, stop++
   a) variables to be used in the loop are defined here. They will only exist during the loop and cannot be accessed afterwards
   b) this is the test to determine whether the loop should continue. 
      if "i" is less than the number of elements in IDS, we should continue.. otherwise, stop
      AND
      if "stop" is less than the number of elements in IDS PLUS 3, we should continue.. otherwise, stop.
        This is a failsafe to make sure our loop doesn't run infinitely because we give UrlFetchApp a chance to try again to work if it fails.
   c) code in this parameter is run after one full iteration of the for loop - so we'll increase i by 1 and stop by 1 each time the loop loops
   
5. We'll use ScriptProperties to get the property IDS[i] - i is the iterator we defined in the for loop and IDS is the array of item IDs,
   so each time the loop completes an iteration the value of i will change to the next number, giving us access to the next item ID
   
6. This is a try catch block. try and catch work together - if something running inside of "try" fails for whatever reason, the code inside
   "catch" will be run. So if UrlFetchApp fails to fetch the LINK + current item ID, the code "continue;" will run, which starts the loop
   going on its next loops
   
7. This checks the HTTP response code of the page we just fetched. If everything went well, a webpage returns 200. If not, something else (think 404) is returned.
   So, if the page code returned is NOT 200, restart this iteration by decrementing "i" and then running "continue"
   This is that extra chance we give UrlFetch, that unchecked could lead to an infinite loop. That's why we have "stop"
   
8. We'll parse that webpage we just fetched using the JSON class and the parse() function, which accepts plaintext and turns it into a JS object
   From the returned object, we navigate it (.item.current.price) and assign the value to newPrice
   
9. We'll use ScriptProperties to set the property of the current item ID to the new price we just grabbed from the website

10. We're checking here to see if the old price we pulled earlier is null. If it is, this means the property did not exist, meaning we never got it before.
    This will be the case for new item IDs we've just added to the array, or if we've just run the script for the first time
    We just set the new price to that same property above this, so we'll "continue" and it'll be fine the next time the script runs.
    
11. Remember "hasUpdated" from earlier? Here, we'll test to see whether the new price we just fetched is equal to the old price we stored in a property
    If they're not the same, we can assume the that GE has updated. We'll set hasUpdated to true. Theoretically we could stop the for loop here
    and send out an e-mail, but we'll update the rest of the item prices in our database to keep everything on the same track
    
(the for loop now repeats until one of the tests is false)

12. Now that we're outside of the for loop, the meat of the function is done.
    This checks to see whether or not the current time - the last update time is less than 12 hours(in milliseconds). If it is, return false,
    as the GE cannot update sooner than 12 hours after last updating
    
13. If hasUpdated is true, run this block of code. Set the ScriptProperties "lastUpdate" property to the current time and return true

14. If the hasUpdated is not true, that block of code will not run and "false" will be returned
*/
function hasGEUpdated() {
    var hasUpdated = false; // Set this to false
    var lastUpdate = Number(ScriptProperties.getProperty("lastUpdate")) || 0; // Set this to the last update time, OR 0 if there is no time stored
    var date = new Date().getTime(); // Set this to the current time

    for (var i = 0, stop = 0; i < IDS.length && stop < (IDS.length + 3); i++, stop++) { // for loop
        var oldPrice = ScriptProperties.getProperty(IDS[i]); // store the old price of current ID to oldPrice or null if it doesn't exist

        try {
            var page = UrlFetchApp.fetch(LINK + IDS[i], {
                "muteHttpExeptions": true
            }); // Get the JSON data of the current ID, muting HTTP exceptions so we don't get those annoying failure e-mails (oops)
        } catch (e) {
            continue;
        }

        if (page.getResponseCode() != 200) { // If the page returns an HTTP status code of anything other than 200 (Success), try again
            i--; // Decrement the operator
            continue; // Restart
        }

        var newPrice = JSON.parse(page.getContentText()).item.current.price; // Parse the JSON we just fetched and get the price from it
        ScriptProperties.setProperty(IDS[i], newPrice); // Store the price we just got to the script properties, overwriting the old price

        if (oldPrice == null) { // If the old price is null, we didn't have one stored. Nothing to compare the new price to, so continue on to the next ID
            continue;
        }

        if (newPrice != oldPrice) { // If the new price is not equal to the old price, the GE probably updated..
            hasUpdated = true; // set hasUpdated to true
        }
    }

    if ((date - lastUpdate) < 43200000) { // if 12 hours haven't passed since the GE last updated, stop here.. Can't update sooner than 12 hours
        return false;
    }

    if (hasUpdated) { // If we set hasUpdated to true above, the GE updated
        ScriptProperties.setProperty("lastUpdate", date); // Set the lastUpdate ScriptProperty to the current time
        return true; // Return true that the GE has updated
    }

    return false; // Return false that the GE hasn't updated
}

/*

This is the function the trigger will run

1. hasGEUpdated() returns true or false depending on whether or not it has updated
   If it returns true, run the code..
   
2. Call the GmailApp class and the sendEmail() function to send us an e-mail

*/
function emailMe() {
    if (hasGEUpdated()) {
        GmailApp.sendEmail(email, subject, message);
    }
}