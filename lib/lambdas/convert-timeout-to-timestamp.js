const SECONDS_TO_MILLISECONDS = 1E3;

exports.handler = async function (event, context) {
  console.log(`Check status event: ${JSON.stringify(event)}`);

  const { timeoutInSeconds } = event;
  const timeoutInMilliseconds = timeoutInSeconds * SECONDS_TO_MILLISECONDS;
  const timeNowInMilliseconds = Date.now();
  const waitTimestamp = new Date(timeoutInMilliseconds + timeNowInMilliseconds)

  return waitTimestamp.toISOString();
};