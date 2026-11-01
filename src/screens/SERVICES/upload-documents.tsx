
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

interface DocumentItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  file: DocumentPicker.DocumentPickerAsset | null;
}

const UploadDocumentsScreen: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: 'id_passport',
      title: 'ID / Passport',
      description:
        'Upload a clear copy of your South African ID or valid passport.',
      required: true,
      file: null,
    },
    {
      id: 'proof_address',
      title: 'Proof of Address',
      description:
        'Upload a recent document confirming your residential address.',
      required: true,
      file: null,
    },
    {
      id: 'drivers_license',
      title: "Driver's License",
      description:
        "Upload a copy of your current driver's license.",
      required: true,
      file: null,
    },
    {
      id: 'vehicle_registration',
      title: 'Vehicle Registration',
      description:
        'Upload the vehicle registration certificate.',
      required: true,
      file: null,
    },
    {
      id: 'medical_certificate',
      title: 'Medical Certificate',
      description:
        'Upload your medical certificate if it is required for your application.',
      required: false,
      file: null,
    },
    {
      id: 'supporting_documents',
      title: 'Supporting Documents',
      description:
        'Upload any additional documents that support your application.',
      required: false,
      file: null,
    },
  ]);

  const pickDocument = async (documentId: string): Promise<void> => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
          ],
          multiple: false,
          copyToCacheDirectory: true,
        });

      if (result.canceled) {
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        return;
      }

      const selectedFile = result.assets[0];

      setDocuments((currentDocuments) =>
        currentDocuments.map((document) =>
          document.id === documentId
            ? {
                ...document,
                file: selectedFile,
              }
            : document
        )
      );
    } catch (error) {
      console.error('Document picker error:', error);

      Alert.alert(
        'Upload Error',
        'Unable to select the document. Please try again.'
      );
    }
  };

  const removeDocument = (documentId: string): void => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setDocuments((currentDocuments) =>
              currentDocuments.map((document) =>
                document.id === documentId
                  ? {
                      ...document,
                      file: null,
                    }
                  : document
              )
            );
          },
        },
      ]
    );
  };

  const getFileSize = (size?: number): string => {
    if (!size) {
      return 'Size unavailable';
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (fileName: string): string => {
    const parts = fileName.split('.');

    if (parts.length < 2) {
      return 'FILE';
    }

    return parts[parts.length - 1].toUpperCase();
  };

  const uploadedCount = documents.filter(
    (document) => document.file !== null
  ).length;

  const requiredDocuments = documents.filter(
    (document) => document.required
  );

  const uploadedRequiredCount = requiredDocuments.filter(
    (document) => document.file !== null
  ).length;

  const allRequiredDocumentsUploaded =
    uploadedRequiredCount === requiredDocuments.length;

  const handleContinue = (): void => {
    const missingDocuments = documents.filter(
      (document) =>
        document.required && document.file === null
    );

    if (missingDocuments.length > 0) {
      const missingNames = missingDocuments
        .map((document) => `• ${document.title}`)
        .join('\n');

      Alert.alert(
        'Required Documents',
        `Please upload the following documents before continuing:\n\n${missingNames}`
      );

      return;
    }

    Alert.alert(
      'Documents Ready',
      'All required documents have been uploaded successfully.',
      [
        {
          text: 'Continue',
          onPress: () => {
            // Add your navigation here.
            // Example:
            // navigation.navigate('ReviewApplication');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Upload Documents
            </Text>

            <Text style={styles.subtitle}>
              Upload the required documents for your license
              application.
            </Text>
          </View>

          {/* Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <View>
                <Text style={styles.progressLabel}>
                  Application Documents
                </Text>

                <Text style={styles.progressCount}>
                  {uploadedCount} of {documents.length} uploaded
                </Text>
              </View>

              <View style={styles.progressCircle}>
                <Text style={styles.progressCircleText}>
                  {uploadedRequiredCount}/{requiredDocuments.length}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${
                      requiredDocuments.length === 0
                        ? 0
                        : (uploadedRequiredCount /
                            requiredDocuments.length) *
                          100
                    }%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.progressDescription}>
              {allRequiredDocumentsUploaded
                ? 'All required documents have been uploaded.'
                : 'Upload all required documents to continue.'}
            </Text>
          </View>

          {/* Information */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>i</Text>
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Accepted file types
              </Text>

              <Text style={styles.infoText}>
                PDF, JPG, JPEG and PNG files are accepted.
              </Text>

              <Text style={styles.infoText}>
                Make sure every document is clear and readable.
              </Text>
            </View>
          </View>

          {/* Documents */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Required Documents
            </Text>

            <Text style={styles.sectionSubtitle}>
              Documents marked as required must be uploaded.
            </Text>
          </View>

          <View style={styles.documentsContainer}>
            {documents.map((document) => (
              <View
                key={document.id}
                style={styles.documentCard}
              >
                {/* Document Header */}
                <View style={styles.documentHeader}>
                  <View style={styles.documentIcon}>
                    <Text style={styles.documentIconText}>
                      DOC
                    </Text>
                  </View>

                  <View style={styles.documentInformation}>
                    <View style={styles.titleRow}>
                      <Text style={styles.documentTitle}>
                        {document.title}
                      </Text>

                      {document.required && (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredText}>
                            Required
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.documentDescription}>
                      {document.description}
                    </Text>
                  </View>
                </View>

                {/* Uploaded File */}
                {document.file ? (
                  <View style={styles.uploadedFileContainer}>
                    <View style={styles.fileRow}>
                      <View style={styles.fileIcon}>
                        <Text style={styles.fileIconText}>
                          {getFileExtension(
                            document.file.name
                          )}
                        </Text>
                      </View>

                      <View style={styles.fileInformation}>
                        <Text
                          style={styles.fileName}
                          numberOfLines={1}
                        >
                          {document.file.name}
                        </Text>

                        <Text style={styles.fileSize}>
                          {getFileSize(document.file.size)}
                        </Text>
                      </View>

                      <View style={styles.successIcon}>
                        <Text style={styles.successIconText}>
                          ✓
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.replaceButton}
                        onPress={() =>
                          pickDocument(document.id)
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={styles.replaceButtonText}
                        >
                          Replace
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() =>
                          removeDocument(document.id)
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={styles.removeButtonText}
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Upload Button */
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() =>
                      pickDocument(document.id)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.uploadIcon}>
                      <Text style={styles.uploadIconText}>
                        +
                      </Text>
                    </View>

                    <Text style={styles.uploadButtonText}>
                      Upload Document
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Security Information */}
          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Text style={styles.securityIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>
                Your documents are secure
              </Text>

              <Text style={styles.securityText}>
                Your documents will be submitted securely with
                your license application.
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !allRequiredDocumentsUploaded &&
                styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Continue
            </Text>
          </TouchableOpacity>

          <Text style={styles.bottomText}>
            You can review your documents before submitting
            your application.
          </Text>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
  },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },

  progressCount: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },

  progressCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: '#1E5EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E5EFF',
  },

  progressBarBackground: {
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#1E5EFF',
    borderRadius: 4,
  },

  progressDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 9,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },

  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E5EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E5EFF',
    marginBottom: 5,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },

  documentsContainer: {
    gap: 14,
  },

  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  documentHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },

  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  documentIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E5EFF',
  },

  documentInformation: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },

  documentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginRight: 7,
  },

  requiredBadge: {
    backgroundColor: '#FDECEC',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  requiredText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D93025',
  },

  documentDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  uploadButton: {
    height: 48,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#1E5EFF',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  uploadIconText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1E5EFF',
  },

  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E5EFF',
  },

  uploadedFileContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  fileIconText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E5EFF',
  },

  fileInformation: {
    flex: 1,
    marginRight: 8,
  },

  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },

  fileSize: {
    fontSize: 11,
    color: '#6B7280',
  },

  successIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E7F7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E9E52',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  replaceButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  replaceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E5EFF',
  },

  removeButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D93025',
  },

  securityCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  securityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E7F7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  securityIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E9E52',
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  securityText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  continueButton: {
    height: 53,
    backgroundColor: '#1E5EFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  continueButtonDisabled: {
    opacity: 0.6,
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  bottomText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 18,
  },
  bottomSpace: {
    height: 25,
  },
});
export default UploadDocumentsScreen;
