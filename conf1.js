// An example configuration file.



var HtmlReporter = require('protractor-beautiful-reporter');


exports.config = {

  // seleniumAddress: 'http://localhost:4444/wd/hub',
  allScriptsTimeout: 1100000000,

  specs: [
      // '*.js',

     'TMS_SIGNUP_EXECUTOR_TEST.js',
     

  ],



  

  capabilities: {
      'browserName': 'chrome',
     //  chromeOptions: {
           args: [ "--headless", "--disable-gpu", "--window-size=1400x2000",'--login-user=ureed', '--login-password=cross8wind$']
     //  },

  },

  // baseUrl: 'http://localhost:3000/',


  framework: 'jasmine',

  jasmineNodeOpts: {
      defaultTimeoutInterval: 300000000
  },


  // Assign the test reporter to each running instance





  // Setup the report before any tests start



  // Close the report after all tests finish
 




  onPrepare: function() {
    // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
    jasmine.getEnv().addReporter(new HtmlReporter({
       baseDirectory: 'Reports/screenshots'
    }).getJasmine2Reporter());
 }
};
