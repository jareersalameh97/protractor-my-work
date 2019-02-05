describe('', function() {

    it('Check TMS signup page', function() {
    
        browser.ignoreSynchronization = true;
        browser.driver.manage().window().maximize();
    browser.    get('http://54.236.35.240/admin/register?type=EX');
    
     
    
    var formElementSelector={
        'email':{selector:'[name=email]',test_data:{'eee':'jareer98999@outlook.com'}},
     'first_name':{selector:'[name=first_name]',test_data:{'not_allow':'mohammad '}},
        'last_name':{selector:'[name=last_name]',test_data:{'abcd':'abdullah test '}},
        'display_name':{selector:'[name=username]',test_data:{'exist':'jareer salameh'}},
        
        'pass':{selector:'[name=password]',test_data:{'joj':'123456'}},
        
        
        'retype_password':{selector:'[name=password_confirmation]',test_data:{'joj_a':'123456'}},
        'worktype':{selector:'[class=min-bold]',test_data:{'click':'click'}},
      
        
    };  
    
    
        

    
       var email=element(by.css(formElementSelector.email.selector));
        email.sendKeys(formElementSelector.email.test_data.eee);
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
            browser.driver.sleep(1000);
            
     
    
    
      var Btton = element(by.xpath('//*[@id="loginform"]/div[2]/button'))    ;
      Btton.click();
    
                                                                               
                                           
                            
                                    
                                        
                                         
        browser.driver.sleep(5000);
                                         
                                         
                                        
                                           
                                        
    
    
    
    
    
    });
    
    }); 