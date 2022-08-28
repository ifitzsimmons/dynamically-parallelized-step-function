import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { join } from 'path';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class ParellizedStepFunctionsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const convertTimeoutToTimestampTask = this.getConvertTimeoutTask();
    const waitState = new sfn.Wait(this, 'Wait for Timer', {
      time: sfn.WaitTime.timestampPath('$.waitTimestamp.isoString'),
    });
    const checktimeoutTask = this.getCheckTimeoutTask();

    // States that handle pass/fail (these are mocks for simplicity)
    const timeoutPass = new sfn.Pass(this, 'Timeout Pass');
    const timeoutFail = new sfn.Pass(this, 'Timeout Fail');
    const choiceState = new sfn.Choice(this, 'SLA Met?')
      .when(sfn.Condition.stringEquals('$.Payload.status', 'PASSED'), timeoutPass)
      .when(sfn.Condition.stringEquals('$.Payload.status', 'FAILED'), timeoutFail);

    const map = new sfn.Map(this, 'Parallelized timers', {
      inputPath: sfn.JsonPath.entirePayload,
      itemsPath: sfn.JsonPath.stringAt('$.timers'),
      maxConcurrency: 50,
      parameters: {
        'timeoutData.$': '$$.Map.Item.Value',
        'orderId.$': '$.orderId'
      }
    });

    // Add the steps to the parallelized state machine (in order)
    map
      .iterator(
        convertTimeoutToTimestampTask
          .next(waitState)
          .next(checktimeoutTask)
          .next(choiceState)
      );

    new sfn.StateMachine(this, 'OrderSlaAlerts', {
      definition: map,
    });
  }

  /**
   * Creates a task state that will take the step function input and convert
   * the timeout in seconds SLA to a timestamp. We'll use this timeout to tell
   * the wait state how long to wait.
   */
  getConvertTimeoutTask = (): LambdaInvoke => {
    // Converts timeout in seconds to a timestamp that cna be used by wait state
    const convertTimeoutToTimestampLambda = new lambda.Function(
      this,
      'ConvertTimeoutToTimestamp',
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'convert-timeout-to-timestamp.handler',
        code: lambda.Code.fromAsset(join(__dirname, 'lambdas')),
      }
    );

    return new sfnTasks.LambdaInvoke(this, 'CreateTimestamps', {
      lambdaFunction: convertTimeoutToTimestampLambda,
      payload: sfn.TaskInput.fromObject({
        orderId: sfn.JsonPath.stringAt('$.orderId'),
        timeoutInSeconds: sfn.JsonPath.numberAt('$.timeoutData.timeoutInSeconds'),
      }),
      resultSelector: {
        'isoString.$': '$.Payload'
      },

      // Add waitTimestamp as input to next state
      resultPath: sfn.JsonPath.stringAt('$.waitTimestamp')
    });
  };

  /**
   * Creates the Lambda function that will check to see if the
   * order has reached the expected state after waiting for SLA
   * and then returns the state machine activity.
   */
  getCheckTimeoutTask = (): LambdaInvoke => {
    // Lambda function that checks to see if some work has been completed after timeout
    const checkTimeout = new lambda.Function(this, 'CheckOrderStatus', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'check-status.handler',
      code: lambda.Code.fromAsset(join(__dirname, 'lambdas')),
    });

    return new sfnTasks.LambdaInvoke(this, 'CheckTimeout', {
      lambdaFunction: checkTimeout,

      // Map state machine input to task state input
      payload: sfn.TaskInput.fromObject({
        orderId: sfn.JsonPath.stringAt('$.orderId'),
        expectedState: sfn.JsonPath.stringAt('$.timeoutData.expectedState'),
        alarmName: sfn.JsonPath.stringAt('$.timeoutData.alarmName'),
      }),

      // Overwrite previous state machine input with output from this task
      resultPath: '$'
    });
  };
}

