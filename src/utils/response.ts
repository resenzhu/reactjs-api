type Error =
{
  status: number,
  subStatus: number,
  message: string
};

type FailedResponse =
{
  success: false,
  error:
  {
    status: number,
    subStatus: number,
    message: string
  }
};

type SuccessResponse =
{
  success: true,
  data: object
};

export const failed = (error: Error): FailedResponse =>
{
  const failedResponse: FailedResponse =
  {
    success: false,
    error:
    {
      status: error.status,
      subStatus: error.subStatus,
      message: error.message
    }
  };

  return failedResponse;
};

export const success = (data: object = {}): SuccessResponse =>
{
  const successResponse: SuccessResponse =
  {
    success: true,
    data: data
  };

  return successResponse;
};
