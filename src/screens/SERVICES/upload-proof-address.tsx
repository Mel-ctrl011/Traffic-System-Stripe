
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const UploadProofOfAddressScreen: React.FC = () => {
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const handleUpload = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/jpeg',
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

      setSelectedFile(result.assets[0]);
    } catch (error) {
      console.error('Proof of address upload error:', error);

      Alert.alert(
        'Upload Error',
        'Unable to select the document. Please try again.',
      );
    }
  };

  const handleRemove = (): void => {
    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this proof of address?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelectedFile(null);
          },
        },
      ],
    );
  };

  const handleContinue = (): void => {
    if (!selectedFile) {
      Alert.alert(
        'Document Required',
        'Please upload your proof of address before continuing.',
      );

      return;
    }

    Alert.alert(
      'Document Uploaded',
      'Your proof of address has been selected successfully.',
    );

    /*
      Connect this to your next screen here.

      Example:

      navigation.navigate('NextScreen');
    */
  };

  const getFileSize = (size?: number): string => {
    if (size === undefined || size === null) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <Text style={styles.title}>
            Proof of Address
          </Text>

          <Text style={styles.subtitle}>
            Upload a recent document showing your current
            residential address.
          </Text>
        </View>

        {/* Document Requirement */}

        <View style={styles.requirementCard}>
          <View style={styles.addressIcon}>
            <Text style={styles.addressIconText}>
              POA
            </Text>
          </View>

          <View style={styles.requirementContent}>
            <Text style={styles.requirementTitle}>
              Proof of Address
            </Text>

            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>
                Required
              </Text>
            </View>
          </View>
        </View>

        {/* Information */}

        <View style={styles.informationCard}>
          <View style={styles.informationIcon}>
            <Text style={styles.informationIconText}>
              i
            </Text>
          </View>

          <View style={styles.informationContent}>
            <Text style={styles.informationTitle}>
              Document Requirements
            </Text>

            <Text style={styles.informationText}>
              • The document should show your full name.
            </Text>

            <Text style={styles.informationText}>
              • The document should show your residential address.
            </Text>

            <Text style={styles.informationText}>
              • Upload a recent proof of address.
            </Text>

            <Text style={styles.informationText}>
              • Accepted formats: PDF, JPG and PNG.
            </Text>
          </View>
        </View>

        {/* Examples */}

        <View style={styles.examplesCard}>
          <Text style={styles.examplesTitle}>
            Accepted Proof of Address
          </Text>

          <Text style={styles.exampleText}>
            • Utility bill
          </Text>

          <Text style={styles.exampleText}>
            • Bank statement
          </Text>

          <Text style={styles.exampleText}>
            • Municipal statement
          </Text>

          <Text style={styles.exampleText}>
            • Official government correspondence
          </Text>
        </View>

        {/* Upload Section */}

        <Text style={styles.sectionTitle}>
          Upload Document
        </Text>

        {!selectedFile ? (
          <TouchableOpacity
            style={styles.uploadBox}
            onPress={handleUpload}
            activeOpacity={0.8}
          >
            <View style={styles.uploadIcon}>
              <Text style={styles.uploadIconText}>
                +
              </Text>
            </View>

            <Text style={styles.uploadTitle}>
              Upload Proof of Address
            </Text>

            <Text style={styles.uploadDescription}>
              Select a document from your device
            </Text>

            <View style={styles.selectButton}>
              <Text style={styles.selectButtonText}>
                Select Document
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileRow}>
              <View style={styles.fileTypeBox}>
                <Text style={styles.fileTypeText}>
                  {getFileExtension(selectedFile.name)}
                </Text>
              </View>

              <View style={styles.fileInformation}>
                <Text
                  style={styles.fileName}
                  numberOfLines={2}
                >
                  {selectedFile.name}
                </Text>

                <Text style={styles.fileSize}>
                  {getFileSize(selectedFile.size)}
                </Text>
              </View>

              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>
                  ✓
                </Text>
              </View>
            </View>

            <View style={styles.uploadedStatus}>
              <Text style={styles.uploadedStatusText}>
                Proof of address successfully selected
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.replaceButton}
                onPress={handleUpload}
                activeOpacity={0.8}
              >
                <Text style={styles.replaceButtonText}>
                  Replace
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemove}
                activeOpacity={0.8}
              >
                <Text style={styles.removeButtonText}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Security */}

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Text style={styles.securityIconText}>
              ✓
            </Text>
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Secure Document
            </Text>

            <Text style={styles.securityDescription}>
              Your proof of address will be securely submitted
              with your license application.
            </Text>
          </View>
        </View>

        {/* Continue */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedFile && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Make sure the document is clear and all required
          information is visible.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 22,
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

  requirementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 15,
  },

  addressIcon: {
    width: 50,
    height: 50,
    borderRadius: 11,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  addressIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E5EFF',
  },

  requirementContent: {
    flex: 1,
  },

  requirementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  requiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDECEC',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  requiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D93025',
  },

  informationCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    marginBottom: 15,
  },

  informationIcon: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#1E5EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  informationIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  informationContent: {
    flex: 1,
  },

  informationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E5EFF',
    marginBottom: 6,
  },

  informationText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#4B5563',
  },

  examplesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 25,
  },

  examplesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  exampleText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#6B7280',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  uploadBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E5EFF',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
  },

  uploadIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  uploadIconText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1E5EFF',
  },

  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  uploadDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
  },

  selectButton: {
    height: 45,
    paddingHorizontal: 25,
    borderRadius: 9,
    backgroundColor: '#1E5EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  fileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  fileTypeBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  fileTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E5EFF',
  },

  fileInformation: {
    flex: 1,
  },

  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },

  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },

  successIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E7F7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  successIconText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E9E52',
  },

  uploadedStatus: {
    backgroundColor: '#E7F7ED',
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
  },

  uploadedStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E7D42',
    textAlign: 'center',
  },

  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },

  replaceButton: {
    flex: 1,
    height: 43,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  replaceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E5EFF',
  },

  removeButton: {
    flex: 1,
    height: 43,
    borderRadius: 8,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 20,
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

  securityDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },

  continueButton: {
    height: 53,
    borderRadius: 10,
    backgroundColor: '#1E5EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  continueButtonDisabled: {
    opacity: 0.5,
  },

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footerText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 12,
  },
});

export default UploadProofOfAddressScreen;
