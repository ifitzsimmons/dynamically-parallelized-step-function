exports.handler = async function (event, context) {
  console.log(`Check status event: ${JSON.stringify(event)}`);

  return {
    status: 200
  };
};