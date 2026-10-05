import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

export interface Ec2Instance {
  instance_id?: string;
  state?: string;
  type?: string;
  public_ip: string | null;
  private_ip: string | null;
  name: string | null;
  launch_time: string | null;
}

/**
 * List EC2 instances in a region using the standard AWS credential chain
 * (env vars, ~/.aws/credentials, or IAM role). Fails with a clear message
 * when no credentials are configured.
 */
export async function ec2Status(region?: string): Promise<{
  region: string;
  count: number;
  instances: Ec2Instance[];
}> {
  const r = region || process.env.AWS_REGION || "ap-south-1";
  const client = new EC2Client({ region: r });
  try {
    const res = await client.send(new DescribeInstancesCommand({}));
    const instances: Ec2Instance[] = (res.Reservations ?? [])
      .flatMap((x) => x.Instances ?? [])
      .map((i) => ({
        instance_id: i.InstanceId,
        state: i.State?.Name,
        type: i.InstanceType,
        public_ip: i.PublicIpAddress ?? null,
        private_ip: i.PrivateIpAddress ?? null,
        name: i.Tags?.find((t) => t.Key === "Name")?.Value ?? null,
        launch_time: i.LaunchTime ? new Date(i.LaunchTime).toISOString() : null,
      }));
    return { region: r, count: instances.length, instances };
  } catch (e) {
    throw new Error(`EC2 query failed — check AWS credentials and region (${r}): ${(e as Error).message}`);
  }
}
