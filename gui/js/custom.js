var intervals = [1, 6, 24, 189, 720];
var config = {};

$.ajax({
  url: "/config/default.json",
  dataType: 'json',
  async: false,
  success: function(data) {
    config = data;
  }
});

$.ajax({
  url: "http://" + config.app.server.publicUrl + ":" + config.app.server.port + "/data",
  dataType: 'json',
  async: false,
  success: function(data) {
    $("#temp").append(data.temp);
    $("#hum").append(data.humidity + "%");
  }
});


function getChartData(interval) {
  var chartData = {};
  query = query = "http://" + config.app.server.publicUrl + ":" + config.app.server.port + "/history/" + interval + "";

  $.ajax({
    url: query,
    dataType: 'json',
    async: false,
    success: function(mydata) {
      mydata = mydata.reverse();
      chartData = {
			  labels : [],
			  datasets : [
				  {
					label: "Temperature",
					backgroundColor : "rgba(30,191,174,0.4)",
					borderColor : "rgba(30,191,174,1)",
					borderWidth: 2,
					pointBackgroundColor : "rgba(30,191,174,1)",
					pointBorderColor : "#fff",
					pointHoverBackgroundColor : "#fff",
					pointHoverBorderColor : "rgba(30,191,174,1)",
					data : []
				  },
				  {
					label: "Humidity",
					backgroundColor : "rgba(249, 36, 63, 0.2)",
					borderColor : "rgba(249, 36, 63, 1)",
					borderWidth: 2,
					pointBackgroundColor : "rgba(249, 36, 63, 1)",
					pointBorderColor : "#fff",
					pointHoverBackgroundColor : "#fff",
					pointHoverBorderColor : "rgba(249, 36, 63, 1)",
					data : []
				  }
			  ]
		  }
		
      mydata.forEach(function(obj) {
        dateObj = new Date(obj.date);
        if(interval > 24 )chartData.labels.push(dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString().slice(0,-3));
        else chartData.labels.push(dateObj.toLocaleTimeString().slice(0,-3));
        chartData.datasets[0].data.push(obj.t);
        chartData.datasets[1].data.push(obj.h);
      });

    }
  });
  var chartDiv = document.getElementById('chart-' + interval + '').getContext("2d");
  var barChart = new Chart(chartDiv, {
    type: 'line',
    data: chartData,
    options: {
        legend: {
          display: true,
        },
        tooltips: {
          mode: "x",
        },
        scales: {
            yAxes: [{
                ticks: {
                    stepSize: 5
                }
            }],
        }
    }
  });
}

intervals.forEach(function(n) {
  getChartData(n);
});