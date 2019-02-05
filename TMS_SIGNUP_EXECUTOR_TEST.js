    describe('', function() {

    it('Check TMS EXECUTOR signup page', function() {
    
        browser.ignoreSynchronization = true;
        browser.driver.manage().window().maximize();
 
                                                                               
                                           
                            
                  
                 browser.    get('https://www.mohmal.com/ar');    
				
				 //*[@id="choose"]
				 
	  browser.driver.sleep(3000);
				 
	  var Bttonaaaaaaa = element(by.xpath('//*[@id="choose"]'))    ;
     Bttonaaaaaaa.click();
     browser.driver.sleep(1000);								 
	 var tttt = element(by.xpath('//*[@id="enterEmail"]/div[1]/input'))    ;
						
						
						var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

						
						var tolowertext = text.toLowerCase();
             tttt.sendKeys(tolowertext);

                                              browser.driver.sleep(1000);
											  
				 var Bttonaaaaaaa2 = element(by.xpath('//*[@id="next"]'))    ;
     Bttonaaaaaaa2.click();
                                         browser.driver.sleep(1500);
											  //*[@id="next"]
			var Bttonaaaaaaa3 = element(by.xpath('//*[@id="create"]'))    ;
     Bttonaaaaaaa3.click();
                                         browser.driver.sleep(1500);
										     
    browser.    get('http://54.236.35.240/admin/register?type=EX');
    
     
    
    var formElementSelector={
        'email':{selector:'[name=email]',test_data:{'eee':'ureed12@emailna.co'}},
     'first_name':{selector:'[name=first_name]',test_data:{'not_allow':'JAREERRRRORORORORO '}},
        'last_name':{selector:'[name=last_name]',test_data:{'abcd':'KJWQEWQKHEKWQORHEOWRIEWIRPWQORWQ'}},
        'display_name':{selector:'[name=username]',test_data:{'exist':'jareer salameh'}},
        
        'pass':{selector:'[name=password]',test_data:{'joj':'123456'}},
        
        
        'retype_password':{selector:'[name=password_confirmation]',test_data:{'joj_a':'123456'}},
        'worktype':{selector:'[class=min-bold]',test_data:{'click':'click'}},
      
        
    };  
    
  
        var str2 = "@emailna.co";
var res = tolowertext.concat(str2);

    
       var email=element(by.css(formElementSelector.email.selector));
        email.sendKeys(res);
       var first_name=element(by.css(formElementSelector.first_name.selector));
       first_name.sendKeys(formElementSelector.first_name.test_data.not_allow);
       var last_name=element(by.css(formElementSelector.last_name.selector));
        last_name.sendKeys(formElementSelector.last_name.test_data.abcd);
       var display_name=element(by.css(formElementSelector.display_name.selector));
       display_name.sendKeys(formElementSelector.display_name.test_data.exist);
       var pass=element(by.css(formElementSelector.pass.selector));
        pass.sendKeys(formElementSelector.pass.test_data.joj);
         
         
         
        
        
    
        
        var retype_password=element(by.css(formElementSelector.retype_password.selector));
            retype_password.sendKeys(formElementSelector.retype_password.test_data.joj_a);
     var jojo=element(by.css(formElementSelector.worktype.selector));
            jojo.click();
				  browser.driver.sleep(10000);
				  var ref222 = element(by.xpath('//*[@id="loginform"]/div[2]/button'))    ;
            ref222.click();
            browser.driver.sleep(1000);
            	
     
    
    
											   browser.driver.sleep(1500);
											       browser.    get('https://www.mohmal.com/ar/view');    
				
				 //*[@id="choose"]
				 
				  browser.driver.sleep(2000);
				  
				
				
				  var rf3 = element(by.xpath('//*[@id="refresh"]/i'))    ;
            rf3.click();	
			
			
			   browser.driver.sleep(5000);									


var ref222 = element(by.xpath('//*[@id="inbox-table"]/tbody/tr/td[2]/a'))    ;
            ref222.click();
			   browser.driver.sleep(5000);									

			   
			  browser.    get('http://54.236.35.240/admin/active_user/JDJ5JDEwJEVBNzVjNXQ5emswRFpQbC5iVFVCRmVRRHVwaS92dkpad3dvMzRVNlVJWG5TTnQ3Vkx5aHk2');    
			
			 
			
												   browser.driver.sleep(10000);									

											   
											  

        //*[@id="create"]
        // //*[@id="choose"]
      //  var mailtext = element(by.className('form-control'));
      //  mailtext.sendKeys("jareersaldsaldsal ");

     // var Bttonaaaaaaa = element(by.xpath('//*[@id="choose"]'))    ;
     // Bttonaaaaaaa.click();
   //   browser.driver.sleep(2000);
      //var mailtext = element(by.className('form-control'));
     // mailtext.sendKeys("jareersaldsaldsal ");
    // //*[@id="click-to-change"]
   // browser.driver.sleep(8000);
   // var dog = element(by.id('postbut'));
    //dog.click();

  

                           

   



   

  


    
    
    
    
    });
    
    }); 