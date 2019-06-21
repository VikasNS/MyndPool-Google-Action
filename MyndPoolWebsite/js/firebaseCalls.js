var config = {
	**Removed**
	};
firebase.initializeApp(config);
var database=firebase.database();
var leaderboardData = {};
var allDomains = [];

function initializeLeaderboardData() {
	var idNameMap = {};
	database.ref('userDetails').once('value')
		.then(snapshot => {
			snapshot.forEach(childSnapshot => {
				idNameMap[childSnapshot.key]=childSnapshot.child('name').val();
			});
		})
		.then(async _ => {
			await database.ref('domainExperts').once('value')
			.then(snapshot => {
				snapshot.forEach(childSnapshot => {
					allDomains.push(childSnapshot.key);
					var domainName = childSnapshot.key;
					var domainExperts=[];
					childSnapshot.forEach(grandChildSnapshot => {
						domainExperts.push({name:idNameMap[grandChildSnapshot.key],id:grandChildSnapshot.key,points:grandChildSnapshot.val()});
					});
					leaderboardData[domainName] = domainExperts;
				});
			});	
		})
		.then(_ => {
			allDomains.unshift("Please Select");
			allDomains.forEach(domain => {
				var domainOption=document.createElement("option");
				domainOption.value=domain;
				domainOption.innerHTML=domain;
				domainOption.id=domain;
				document.getElementById("domainSelector").appendChild(domainOption);
			});

		});
}

function loadLeaderboard() {
	i=1;
	var domain = document.getElementById("domainSelector").value;
	var leaderBoardTable = document.getElementById("leaderboardTable");
	while (leaderBoardTable.rows.length > 1 ) {
	  leaderBoardTable.deleteRow(leaderBoardTable.rows.length-1);
	}
	leaderboardData[domain].forEach(userData => {
		var row = leaderBoardTable.insertRow(i);
		var id = row.insertCell(0);
		var name = row.insertCell(1);
		var points = row.insertCell(2);
		id.innerHTML = userData.id;
		name.innerHTML = userData.name;
		points.innerHTML = userData.points;
	});

}

function getDomainStatistics() {
	var domainStatisticsTable = document.getElementById("domainStatisticsTable");
	var i=1;
	database.ref('domainStatistics').once('value')
		.then(snapshot=>{
			snapshot.forEach(childSnapshot=>{
				var row = domainStatisticsTable.insertRow(i);
				var domainName = row.insertCell(0);
				var expertSessionCount = row.insertCell(1);
				domainName.innerHTML = childSnapshot.key;
				expertSessionCount.innerHTML = childSnapshot.val();
			});
		});
}

