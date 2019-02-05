describe('sign in test', function() {

it('check user name and password', function() {

browser.ignoreSynchronization = true;
browser.get('http://54.236.35.240/');

 var go=element(by.xpath('/html/body/div[2]/div/div/div[2]/a[2]/button'))    ; 
  go.click() ;
  





  var u_name=element(by.xpath('//*[@id="loginform"]/label[1]/input'))    ; 
  var pass=element(by.xpath('//*[@id="loginform"]/label[2]/input'))    ;

  
  u_name.sendKeys('customer@gmail.com');
  pass.sendKeys('123456');
									 
									
	var Btton = element(by.xpath('//*[@id="loginform"]/div/button'))    ;
																		
	
	 Btton.click() ;
	 
	 
	expect(browser.getCurrentUrl()).toEqual("http://54.236.35.240/index.html#/vue/project");
									
									
									
									
									 
									 
	
									 
  browser.driver.sleep(5000);


});

}); 

