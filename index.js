const {
    dialogflow,
    BasicCard,
    BrowseCarousel,
    BrowseCarouselItem,
    Button,
    Permission,
    Carousel,
    Image,
    LinkOutSuggestion,
    List,
    MediaObject,
    Suggestions,
    SimpleResponse,
    Table,
} = require('actions-on-google');
var admin = require('firebase-admin');

var fire;

function initializeFirebase()
{
   fire = admin.initializeApp(
       {
        credential: **Removed**
        });
}


const app = dialogflow({debug: true});

app.intent('Default Welcome Intent',(conv,{name,emailID,phoneNo,domain}) => {
    var db=admin.database();
    return db.ref(`userDetails/${conv.user.id}`).once('value')
        .then((snapshot) => {
             if(snapshot.exists()) {
                 return {'isRegistered':true,'snapshot':snapshot};
             } else {
                 return [false,null];
             }
        })
        .then((result) => {
            if(result['isRegistered']) {
                conv.ask(`Thank You ${result['snapshot'].child('name').val()}. We are all set.! How can I help you?`);
                conv.ask(new Suggestions(['Get Expert','Give Feedback','Track Performance']));
                } else {
                    var gotName = name.length > 0;
                    var gotEmaiID = emailID.length > 0;
                    var gotPhoneNo = phoneNo.length > 0;
                    var gotDomain = domain.length > 0;
                    if(!gotName && !gotEmaiID && !gotPhoneNo && !gotDomain) {
                        return conv.ask('Hey, this is Mynd Pool. Before we start finding experts for you, Lets get to know each other. What is your name?');
                    }else if(gotName && !gotEmaiID && !gotPhoneNo && !gotDomain) {
                        conv.ask(`Good name ${name}. Please help me with your E-mail ID so that others can connect with you.`)
                    }else if(gotName && gotEmaiID && !gotPhoneNo && !gotDomain) {
                        conv.ask(`Thank You ${name}. Your phone number please?`);
                    }else if(gotName && gotEmaiID && gotPhoneNo && !gotDomain) {
                        conv.ask('One last thing, help me with the top 3 domains you are good at.!');
                    }else if(gotName && gotEmaiID && gotPhoneNo && gotDomain) {
                        conv.ask(`Thank You ${name}. We are all set.! How can I help you?`);
                        conv.ask(new Suggestions(['Get Expert','Give Feedback','Track Performance']));
                        return db.ref('userDetails').child(`${conv.user.id}`).set({
                            name:name,
                            emailID:emailID,
                            phoneNo:phoneNo,
                            points:0,
                            domain1:domain[0],
                            domain2:domain[1],
                            domain3:domain[2]
                        }).
                        then(()=>{
                            return db.ref(`domainExperts/${domain[0]}`).set({
                                [conv.user.id]:0
                            });
                        })
                        .then(()=>{
                            return db.ref(`domainExperts/${domain[1]}`).set({
                                [conv.user.id]:0
                            });
                        }).
                        then(()=>{
                            return db.ref(`domainExperts/${domain[2]}`).set({
                                [conv.user.id]:0
                            });
                        })
                        }
                    }})
                    .then(()=>{
                        fire.delete()
                    });
});

app.intent('Get Expert',(conv,{domain}) => {
    var gotDomain = domain.length > 0;
    
    if(!gotDomain) {
        conv.ask('Sure, Please help me with the domain name.!');
    }else {
        var db=admin.database();
        var flag=0;
        return db.ref(`domainExperts/${domain}`).orderByValue().limitToLast(3).once('value')
            .then((snapshot)=>{
                var expertsList=[];
                snapshot.forEach((childSnapshot)=>{
                    expertsList.unshift(childSnapshot.key);
                });
                return new Promise((resolve,reject)=>{
                    resolve(expertsList);
                });
            })
            .then(async(expertsList)=>{
                 var nameIdMap=[];
                 var expertsUiItems=[];
                 for(var i=0;i<expertsList.length;i++) {
                    var expertUiObject={
                          url: 'https://www.thyssenkrupp.com/garage/',
                          image: new Image({
                            url: 'https://www.shareicon.net/data/512x512/2016/07/11/794381_people_512x512.png',
                            alt: 'Image alternate text',
                          }),
                        }; 
                    await db.ref(`userDetails/${expertsList[i]}`).once('value')
                        .then((snapshot)=>{
                            var name=snapshot.child('name').val();
                            nameIdMap.push(
                                {
                                    name:name,
                                    id : expertsList[i]
                                }
                                );
                            expertUiObject['title']=name;
                            expertUiObject['description']=`EmailID: ${snapshot.child('emailID').val()}
                                                           Phone No: ${snapshot.child('emailID').val()}`;
                            expertsUiItems.unshift(new BrowseCarouselItem(expertUiObject));   
                            return 1;
                        });
                }
                return new Promise((resolve,reject)=>{
                    resolve([expertsUiItems,nameIdMap]);
                });
            })
            .then((result)=>{
                var feedbackNode = db.ref(`userDetails/${conv.user.id}/feedback`).push();
                feedbackNode.set(
                    {
                        domain:domain,
                        [result[1][0].name]:result[1][0].id,
                        [result[1][1].name]:result[1][1].id,
                        [result[1][2].name]:result[1][2].id,
                        time:new Date().toString().replace(/T/, ':').replace(/\.\w*/, '')
                    }
                    );
                return new Promise((resolve,reject)=>{
                    resolve(result[0]);
                });
            })
            .then((expertsUiItems)=>{
                conv.ask(`Here are the top Experts in ${domain}`);
                conv.ask(new BrowseCarousel({items:expertsUiItems}));
            })
            .then(()=>{
                fire.delete();
            });
    }
});

app.intent('Give Feedback',(conv,{name,score}) => {
    var gotName=name.length>0;
    var gotScore=score.length>0;
    var db=admin.database();
    
    if(!gotName && !gotScore) {
        var allFeedbacks=[];
        return db.ref(`userDetails/${conv.user.id}/feedback`).once('value')
            .then((snapshot)=>{
                snapshot.forEach((childSnapshot)=>{
                allFeedbacks.push(Object.assign(childSnapshot.val(),{hash:childSnapshot.key}));    
                });
            })
            .then(()=>{
                allFeedbacks.sort((a,b)=>{
                    return new Date(b.time) - new Date(a.time);
                });
                var latestExpertSession=allFeedbacks[allFeedbacks.length - 1];
                conv.data.latestExpertSession=latestExpertSession;
                var experts=[]
                for(var key in latestExpertSession) {
                    if(key != 'domain' && key != 'time' && key != 'hash') {
                        experts.push(key);
                    }
                    
                    conv.ask('Sure, Your Latest feedback session was on '+latestExpertSession.domain+' on '+new Date(latestExpertSession.time).toUTCString().split(' ').slice(1, 4).join(' '));
                    conv.ask(' With Whome did you take the Expert Session?');
                    conv.ask(new Suggestions(experts));
                    
                }
                
            })
            .then(()=>{
                fire.delete();
            });
    } else if(gotName && !gotScore) {
        conv.ask(`In a scale of 1 to 5 how would you rate your expert Session with ${name} ?`);
        conv.ask(new Suggestions([1,2,3,4,5]));
        fire.delete();
    } else if(gotName && gotScore) {
        db.ref(`userDetails/${conv.user.id}/feedback/${conv.data.latestExpertSession['hash']}`)
            .remove()
            .then(async ()=>{
                    await db.ref(`domainExperts/${conv.data.latestExpertSession['domain']}/${conv.data.latestExpertSession[name]}`).once('value')
                    .then((snapshot)=>{
                        return new Promise(resolve =>{
                            resolve(snapshot.val());
                        });
                    }).then(async (points)=>{
                        var updatedPoints=parseInt(points)+parseInt(score);
                        await db.ref(`domainExperts/${conv.data.latestExpertSession['domain']}/${conv.data.latestExpertSession[name]}`).set(updatedPoints)
                            .then(()=>{
                                return 1;
                                
                            });
                    });
            })
            .then(async ()=>{
                await db.ref(`userDetails/${conv.data.latestExpertSession[name]}/points`).once('value').then(snapshot=>{
                    return new Promise(resolve=>{
                        resolve(snapshot.val());
                    });
                }).then(async points=>{
                    var updatedPoints=parseInt(points)+parseInt(score);
                    await db.ref(`userDetails/${conv.data.latestExpertSession[name]}/points`).set(updatedPoints).then(_ => {
                        return 1;
                    });
                });
            })
            .then(()=>{
                fire.delete();
            });
        conv.ask('Thankyou for your feedback...!');
        conv.ask(new Suggestions(['Get Expert','Give Feedback','Track Performance']));
        
    }
});

app.intent('Track Performance',(conv) => {
    var db=admin.database();
    return db.ref(`userDetails/${conv.user.id}/points`).once('value')
        .then((snapshot)=>{
            conv.ask(`Sure, You have scored ${snapshot.val()}. Thankyou for your help.!`);
        })
        .then(()=>{
            fire.delete();
        });
});
 
exports.fulfillment = function(event, context, callback) {
    //context.callbackWaitsForEmptyEventLoop = false;
    if (!admin.apps.length) {
        initializeFirebase();
    }
    app.handler(event, {}).then((res) => {

        if (res.status != 200) {
            callback(null, {"fulfillmentText": `I got status code: ${res.status}`});
        } else {
            callback(null, res.body);
        }
    }).catch((e) => {
    callback(null, {"fulfillmentText": `There was an error\n${e}`});
    });
}; 
 
