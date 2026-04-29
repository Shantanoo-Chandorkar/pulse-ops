export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { deletedCount } = await CheckResult.deleteMany({ timestamp: { $lt: cutoff } });

    console.info('[maintenance] old check results deleted', { deletedCount });
    return Response.json({ deletedCount });
}