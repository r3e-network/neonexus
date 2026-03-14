'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { KubernetesDeployer, DeploymentConfig } from '@/services/KubernetesDeployer';

export async function createEndpointAction(formData: {
  name: string;
  network: string;
  type: string;
  clientEngine: string;
  provider: string;
  region: string;
  syncMode: string;
}) {
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. Simulate Control Plane Deployment
  const k8sConfig: DeploymentConfig = {
    name: formData.name,
    network: formData.network as 'mainnet' | 'testnet',
    type: formData.type as 'shared' | 'dedicated',
    clientEngine: formData.clientEngine as 'neo-go' | 'neo-cli',
    provider: formData.provider as 'aws' | 'gcp',
    region: formData.region,
    syncMode: formData.syncMode as 'full' | 'archive'
  };

  const k8sResult = await KubernetesDeployer.deployNode(k8sConfig);

  if (!k8sResult.success) {
    return { success: false, error: 'Control Plane failed to schedule deployment on Kubernetes cluster.' };
  }

  // 2. Persist to Database
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    
    // Generate a mock URL based on config
    const randomId = Math.random().toString(36).substring(2, 8);
    const url = formData.type === 'dedicated' 
      ? `https://node-${formData.region}-${randomId}.neonexus.io/v1`
      : `https://${formData.network}.neonexus.io/v1/${randomId}`;

    const { data, error } = await supabase
      .from('endpoints')
      .insert([
        {
          name: formData.name,
          network: formData.network === 'mainnet' ? 'N3 Mainnet' : 'N3 Testnet',
          type: formData.type.charAt(0).toUpperCase() + formData.type.slice(1),
          client_engine: formData.clientEngine,
          cloud_provider: formData.type === 'dedicated' ? formData.provider : null,
          region: formData.type === 'dedicated' ? formData.region : null,
          url: url,
          status: 'Syncing', // Starts in syncing state
          requests: '0',
          k8s_namespace: k8sResult.namespace,
          k8s_deployment_name: k8sResult.releaseName
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating endpoint:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/endpoints');
    return { success: true, id: data.id };
  } else {
    // Mock successful creation for local dev without Supabase
    console.log('Supabase not configured. Mocking endpoint creation:', formData);
    return { success: true, id: 1 }; // Return mock ID 1
  }
}
