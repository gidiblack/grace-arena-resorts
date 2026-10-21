import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatLongDate } from "@/lib/formatters/date";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#2D3748",
    backgroundColor: "#FFFFFF",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#B7791F",
    paddingBottom: 16,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A365D",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 9,
    color: "#718096",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#EDF2F7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    textAlign: "right",
  },
  badgeRef: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#B7791F",
  },
  badgeStatus: {
    fontSize: 8,
    color: "#4A5568",
    marginTop: 2,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1A365D",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  grid2: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  col: {
    width: "48%",
  },
  label: {
    fontSize: 8,
    color: "#718096",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 8,
  },
  table: {
    marginTop: 10,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E0",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colRoom: { width: "50%" },
  colQty: { width: "15%", textAlign: "center" },
  colRate: { width: "15%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  totalsArea: {
    alignSelf: "flex-end",
    width: "45%",
    marginTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: "#1A365D",
    marginTop: 6,
    paddingTop: 6,
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    textAlign: "center",
    color: "#A0AEC0",
    fontSize: 8,
  },
});

export interface BookingPdfData {
  reference: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rooms: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  dealDiscount: number;
  tax: number;
  total: number;
  createdAt: string;
  paymentGateway?: string;
}

export function renderBookingDocument(data: BookingPdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>Grace Arena Resorts</Text>
            <Text style={styles.brandSubtitle}>Faith • Hospitality • Serenity</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeRef}>{data.reference}</Text>
            <Text style={styles.badgeStatus}>Status: {data.status}</Text>
          </View>
        </View>

        {/* Guest & Stay Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reservation Summary</Text>
          <View style={styles.grid2}>
            <View style={styles.col}>
              <Text style={styles.label}>Guest Name</Text>
              <Text style={styles.value}>{data.guestName}</Text>

              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{data.guestEmail}</Text>

              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{data.guestPhone}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Check-In Time</Text>
              <Text style={styles.value}>
                {formatLongDate(data.checkInDate)} at 2:00 PM (14:00)
              </Text>

              <Text style={styles.label}>Check-Out Time</Text>
              <Text style={styles.value}>
                {formatLongDate(data.checkOutDate)} at 11:00 AM (11:00)
              </Text>

              <Text style={styles.label}>Duration of Stay</Text>
              <Text style={styles.value}>{data.nights} Night(s)</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accommodations</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colRoom}>Accommodation</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colRate}>Rate</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {data.rooms.map((room, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colRoom}>{room.name}</Text>
                <Text style={styles.colQty}>{room.quantity}</Text>
                <Text style={styles.colRate}>{formatCurrency(room.unitPrice)}</Text>
                <Text style={styles.colTotal}>{formatCurrency(room.lineTotal)}</Text>
              </View>
            ))}
          </View>

          {/* Totals Breakdown */}
          <View style={styles.totalsArea}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(data.subtotal)}</Text>
            </View>
            {data.dealDiscount > 0 && (
              <View style={styles.totalRow}>
                <Text>Promotional Discount:</Text>
                <Text>-{formatCurrency(data.dealDiscount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text>VAT (7.5%):</Text>
              <Text>{formatCurrency(data.tax)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={{ fontWeight: "bold", fontSize: 11, color: "#1A365D" }}>
                Total Amount:
              </Text>
              <Text style={{ fontWeight: "bold", fontSize: 11, color: "#B7791F" }}>
                {formatCurrency(data.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancellation Notice */}
        <View style={{ marginTop: 24, padding: 10, backgroundColor: "#F7FAFC", borderRadius: 4 }}>
          <Text style={{ fontWeight: "bold", fontSize: 9, color: "#4A5568", marginBottom: 3 }}>
            Cancellation & Check-in Notice:
          </Text>
          <Text style={{ fontSize: 8, color: "#718096", lineHeight: 1.4 }}>
            Full refund applies for cancellations 72+ hours prior to check-in (14:00). 50% refund
            applies between 24–72 hours. Cancellations within 24 hours and no-shows are
            non-refundable.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Grace Arena Resorts • Plot 12, Serenity Valley, Lagos, Nigeria</Text>
          <Text style={{ marginTop: 2 }}>
            Concierge Desk & WhatsApp: +234 801 234 5678 • Email: reservations@gracearenaresorts.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renders the Booking PDF and returns raw Buffer for email attachments or direct download streaming
 */
export async function generateBookingPdfBuffer(data: BookingPdfData): Promise<Buffer> {
  const doc = renderBookingDocument(data);
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
