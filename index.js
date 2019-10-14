const fs = require("fs");
const ChartjsNode = require("chartjs-node");
const TARGET_DIMENSIONS = { width: 800, height: 600 };
const CHART_BACKGROUND_COLOR = "white";

const fetchMetricsFromS3 = async () => {
  const readFile = require("util").promisify(fs.readFile);
  const data = JSON.parse(await readFile("./fixtures.json", "utf-8"));
  return data;
};

const getMetrics = async () => {
  const { metrics } = await fetchMetricsFromS3();
  return metrics;
};

const createGraph = (chartNode, { measures }) => {
  return chartNode.drawChart({
    type: "line", // "bar" is another possibility
    data: {
      datasets: [
        {
          label:
            "Usage of request and response outside of controllers/middlewares",
          data: measures.map(e => {
            return {
              y: e.measure,
              x: new Date(e.timestamp)
            };
          }),
          fillColor: "#800",
          strokeColor: "blue",
          backgroundColor: "#9c0"
        }
      ]
    },
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true
            }
          }
        ]
      }
    }
  });
};

const getChartNode = () => {
  const { width, height } = TARGET_DIMENSIONS;
  return new Promise((resolve, reject) => {
    const chartNode = new ChartjsNode(width, height);
    // ensure that the canvas doesn't have a transparent background
    chartNode.on("beforeDraw", c => {
      const backgroundColor = CHART_BACKGROUND_COLOR;
      c.plugins.register({
        beforeDraw: function(c) {
          var ctx = c.chart.ctx;
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, c.chart.width, c.chart.height);
        }
      });
    });
    chartNode.on("error", () => {
      reject(error);
    });
    resolve(chartNode);
  });
};

const createMetricVisualization = async metric => {
  const chartNode = await getChartNode();
  const graph = await createGraph(chartNode, metric);
  const buffer = await chartNode.getImageBuffer("image/png");
  const base64 = buffer.toString("base64");
  const contents = `data:image/png;base64,${base64}`;
  chartNode.destroy();
  console.log(contents);
  return contents;
};

const createMetricsVisualizations = async () => {
  const metrics = await getMetrics();
  const visualizations = await Promise.all(
    metrics.map(async metric => {
      const base64 = await createMetricVisualization(metric);
      return {
        metric: metric.name,
        base64
      };
    })
  );
  return visualizations;
};

// run!
createMetricsVisualizations()
  .then(results => {
    console.log(results);
  })
  .catch(error => {
    console.error(error);
  });
