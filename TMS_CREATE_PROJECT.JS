describe('Create a Project', function() {

    it('check user name and password', function() {
    
    browser.ignoreSynchronization = true;
    browser.get('http://54.236.35.240/');
    browser.ignoreSynchronization = true;
    browser.driver.manage().window().maximize();
     var go=element(by.xpath('/html/body/div[2]/div/div/div[2]/a[2]/button'))    ; ; 
      go.click() ;
    
    
    
    
    
      var u_name=element(by.xpath('//*[@id="loginform"]/label[1]/input'))    ; ; 
      var pass=element(by.xpath('//*[@id="loginform"]/label[2]/input'))    ;;
    
      
      u_name.sendKeys('customer@gmail.com');
      pass.sendKeys('123456');
                                         
                                        
             var Btton = element(by.xpath('//*[@id="loginform"]/div/button'))    ;
                                                                            
        
                                         Btton.click() ;
                                        
										  browser.driver.sleep(2000);
										
										 var Btton1 = element(by.xpath('//*[@id="main"]/div/div[2]/div[1]/div/div[2]/button'))    ;
                                                                            
        
                                         Btton1.click() ;
       browser.driver.sleep(1000);

       var t1 = element(by.xpath('//*[@id="proj-title"]'))    ;
       var t2 = element(by.xpath('//*[@id="term-date"]'))    ;
       
       var t2d1 = element(by.xpath('//*[@id="term-date"]/div/div[2]/div[3]/div[2]'))    ;
       var t3 = element(by.xpath('//*[@id="from_language_input"]'))    ;
       var t4 = element(by.xpath('//*[@id="to_language_input"]'))    ;
       var t5 = element(by.xpath('//*[@id="domain-select"]'))    ;
       var t6 = element(by.xpath('//*[@id="subdomain-select"]'))    ;
       var Btton2 = element(by.xpath('//*[@id="main"]/div/form/div[1]/div[2]/div/div[2]/div/div/div[10]/button'))    ;
       
       t1.sendKeys('12345');
       t2.click();
       t2d1.click();
       t2d1.click();

       t3.sendKeys('English');
       t4.sendKeys('Arabic');
       t5.sendKeys('medical');
       t6.sendKeys('medical');

       Btton2.click();

       browser.driver.sleep(3000);

      var Btton3 = element(by.xpath('//*[@id="main"]/div/div[1]/div[2]/div/div[2]/button'))    ;
      Btton3.click();

                                       
      browser.driver.sleep(3000);
        var Btton4 = element(by.xpath('//*[@id="main"]/div/div[1]/form/div/div/button[2]'))    ;
        Btton4.click();
        browser.driver.sleep(3000);
         var Btton5 = element(by.xpath(' //*[@id="main"]/div/div[1]/div[2]/div/div[2]/div/div/div[3]/div/div[1]/div[1]/label'))    ;
         Btton5.click();            
                 
         browser.driver.sleep(4000);
         
         var Btton6 = element(by.xpath('    //*[@id="tr_40"]/div[4]/div/button '))    ;
         Btton6.click();          
                                         
                                    
                                         
         browser.driver.sleep(5000);
    
    
    });
    
    
    }); 
    
    