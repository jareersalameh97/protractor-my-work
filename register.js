//'use strict';

/* https://github.com/angular/protractor/blob/master/docs/toc.md */
browser.driver.manage().window().maximize();


var formElementSelector={
    'first_name':{selector:'[formcontrolname=first_name]',test_data:{'not_allow':'mohammad hashim'}},
    'last_name':{selector:'[formcontrolname=last_name]',test_data:{'not_allow':'abdullah test '}},
    'email':{selector:'[formcontrolname=email]',test_data:{'exist':'taylorsuccessor@gmail.com'}},
    'password':{selector:'[formcontrolname=password]',test_data:{'short':'PassPass1'}},
    'retype_password':{selector:'[formcontrolname=retype_password]',test_data:{'short':'PassPass1'}},
    'work_type':{selector:'[formcontrolname=work_type][value=fr]',test_data:{'click':'click'}},
    'submit':{selector:'[type=submit]',test_data:{'click':'click'}}
};

describe('register new user', function() {



    it('should automatically redirect to /en/account/register ', function() {
        browser.get('https://ureed.com/en/account/register');

        browser.waitForAngularEnabled(false);
        browser.waitForAngular();
        browser.driver.sleep(5000);

        var first_name=element(by.css(formElementSelector.first_name.selector));
        first_name.sendKeys(formElementSelector.first_name.test_data.not_allow);

        var last_name=element(by.css(formElementSelector.last_name.selector));
        last_name.sendKeys(formElementSelector.last_name.test_data.not_allow);


        var email=element(by.css(formElementSelector.email.selector));
        email.sendKeys(formElementSelector.email.test_data.exist);

        var password=element(by.css(formElementSelector.password.selector));
        password.sendKeys(formElementSelector.password.test_data.short);


        var retype_password=element(by.css(formElementSelector.retype_password.selector));
        retype_password.sendKeys(formElementSelector.retype_password.test_data.short);


        var work_type=element(by.css(formElementSelector.work_type.selector));
        work_type.click();

        var submit=element(by.css(formElementSelector.submit.selector));


        submit.click();



        // browser.driver.sleep(220000);




    });



});
