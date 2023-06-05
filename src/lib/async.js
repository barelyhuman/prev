export const nopanic = async fn => {
  try {
    return {
      data: await fn(),
      error: undefined,
    }
  } catch (error) {
    return {
      data: undefined,
      error: error,
    }
  }
}
